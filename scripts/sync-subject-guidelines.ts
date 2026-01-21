
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

// Load env
dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const GUIDELINES_PATH = path.resolve('subject_guidelines.md');

function sanitizeJson(str: string): string {
    return str.replace(/(\\\\)|(\\)([^"\\/bfnrtu])/g, (match, double, single, char) => {
        if (double) return double;
        return '\\\\' + char;
    });
}

function parseGuidelines(content: string) {
    const subjects = [];
    const lines = content.split('\n');
    
    let currentSubject: any = null;
    let buffer: string[] = [];
    let state: 'NONE' | 'INSTRUCTION' | 'FEW_SHOT' | 'BAD_FEW_SHOT' = 'NONE';

    const flushBuffer = () => {
        const text = buffer.join('\n').trim();
        if (!currentSubject) return;

        if (state === 'INSTRUCTION' && text) {
            currentSubject.instruction = text;
        } else if (state === 'FEW_SHOT' && text) {
             try {
                const cleanText = sanitizeJson(text);
                const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    currentSubject.fewShot = JSON.parse(jsonMatch[0]);
                }
             } catch (e) {
                 console.error(`Error parsing Few-Shot JSON for ${currentSubject.name}:`, e);
             }
        } else if (state === 'BAD_FEW_SHOT' && text) {
             try {
                 const cleanText = sanitizeJson(text);
                 const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
                 if (jsonMatch) {
                     currentSubject.badFewShot = JSON.parse(jsonMatch[0]);
                 }
             } catch (e) {
                 console.error(`Error parsing Bad Few-Shot JSON for ${currentSubject.name}:`, e);
             }
        }
        buffer = [];
    };

    for (const line of lines) {
        const trimmed = line.trim();

        const subjectMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
        
        if (subjectMatch && state !== 'INSTRUCTION') {
            flushBuffer();
            if (currentSubject) subjects.push(currentSubject);

            currentSubject = {
                name: subjectMatch[2].trim(),
                instruction: '',
                fewShot: null,
                badFewShot: null
            };
            state = 'NONE';
            continue;
        }

        if (trimmed.startsWith('Instruction (Talimat):')) {
            flushBuffer();
            state = 'INSTRUCTION';
            continue;
        } 
        
        if (trimmed.startsWith('Few-Shot Example (JSON):')) {
            flushBuffer();
            state = 'FEW_SHOT';
            continue;
        }

        if (trimmed.startsWith('Bad Few-Shot Example (JSON):')) {
            flushBuffer();
            state = 'BAD_FEW_SHOT';
            continue;
        }

        if (state !== 'NONE') {
            buffer.push(line);
        }
    }

    flushBuffer();
    if (currentSubject) subjects.push(currentSubject);

    return subjects;
}

async function sync() {
    console.log('Reading subject_guidelines.md...');
    const content = fs.readFileSync(GUIDELINES_PATH, 'utf-8');
    const subjects = parseGuidelines(content);

    console.log(`Parsed ${subjects.length} subjects.`);

    try {
        // 1. Fetch ALL existing subjects
        const res = await pool.query('SELECT id, subject_name FROM subject_guidelines');
        const dbSubjects = res.rows;

        console.log(`Fetched ${dbSubjects.length} subjects from DB for matching.`);
        
        let isFirst = true;

        for (const subj of subjects) {
            console.log(`Syncing: ${subj.name}`);
            
            let match = dbSubjects.find(s => s.subject_name === subj.name);
            
            if (!match) {
                 match = dbSubjects.find(s => 
                    subj.name.includes(s.subject_name) || s.subject_name.includes(subj.name)
                 );
            }

            if (!match) {
                console.warn(`[WARNING] No match found for "${subj.name}". Creating new entry via INSERT...`);
            } else {
                console.log(`[MATCH] "${subj.name}" matches DB "${match.subject_name}"`);
            }

            // Prepare values
            const subjectName = match ? match.subject_name : subj.name;
            const instruction = subj.instruction;
            const fewShotExample = subj.fewShot ? JSON.stringify(subj.fewShot) : null;
            const badFewShotExample = subj.badFewShot ? JSON.stringify(subj.badFewShot) : null;

            if (isFirst) {
                console.log('[DEBUG] First subject payload badFewShot:', badFewShotExample?.substring(0, 100));
                isFirst = false;
            }

            try {
                 if (match) {
                     await pool.query(
                         `UPDATE subject_guidelines 
                          SET instruction = $1, few_shot_example = $2, bad_few_shot_example = $3
                          WHERE id = $4`,
                         [instruction, fewShotExample, badFewShotExample, match.id]
                     );
                 } else {
                     await pool.query(
                         `INSERT INTO subject_guidelines (subject_name, instruction, few_shot_example, bad_few_shot_example)
                          VALUES ($1, $2, $3, $4)`,
                         [subjectName, instruction, fewShotExample, badFewShotExample]
                     );
                 }

            } catch (e) {
                console.error(`Error processing ${subj.name}:`, e);
            }
        }
    } catch (err) {
        console.error('Database connection error:', err);
    } finally {
        await pool.end();
    }

    console.log('Sync complete!');
}

sync();
