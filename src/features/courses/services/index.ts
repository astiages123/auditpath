export * from './videoService';
export * from './coursesConfig';
// courses.json cannot be re-exported with * because of resolveJsonModule behavior with default export
import coursesData from './courses.json';
export { coursesData };
