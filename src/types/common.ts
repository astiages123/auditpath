import { User as SupabaseUser } from '@supabase/supabase-js';

/**
 * Standart Kullanıcı tipi, Supabase User tipini referans alır.
 */
export type User = SupabaseUser;

/**
 * Yapay zeka yanıtındaki token kullanımı ve diğer meta verileri temsil eder.
 */
export interface AIResponseMetadata {
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cached_tokens?: number;
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
    prompt_tokens_details?: {
      cached_tokens?: number;
    };
  };
}

/**
 * Genel API yanıtlarını sarmalayan standart arayüz.
 * @template T - Yanıt verisinin tipi.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

/**
 * Üstesinden gelinemeyen veya esnek JSON verilerini güvenli şekilde tiplendirmek için kullanılır.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | {
      [key: string]: Json | undefined;
    }
  | Json[];

/**
 * Genel amaçlı loglama geri çağırım (callback) fonksiyonu tipi.
 */
export type LogCallback = (
  message: string,
  details?: Record<string, unknown>
) => void;

/**
 * Uygulama genelinde kullanılan standart log seviyeleri.
 */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Standart log mesajı veri yapısını temsil eder.
 */
export interface LogMessage {
  level: LogLevel;
  message: string;
  details?: Record<string, unknown> | Error;
  timestamp: string;
}

/**
 * LLM (Büyük Dil Modeli) ile etkileşim mesajını temsil eder.
 */
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Tema modu seçeneklerini belirtir.
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Tarih ve saat değerlerini ISO formatında tutan ortak yapı.
 */
export type Timestamp = string;
