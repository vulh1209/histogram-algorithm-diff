/**
 * TokenSource implementations for different input types.
 * Ported from Rust imara-diff/src/sources.rs
 */

/**
 * A source that can be tokenized into a sequence of tokens.
 */
export interface TokenSource<T> {
  /**
   * Create an iterator over tokens.
   */
  tokenize(): IterableIterator<T>;
  
  /**
   * Estimate the number of tokens (for pre-allocation).
   */
  estimateTokens(): number;
}

/**
 * Tokenizer for string lines.
 * Splits by newline characters, keeping the newline in each token.
 * This means that changing \r\n to \n or omitting the final newline is detected.
 */
export class StringLines implements TokenSource<string> {
  constructor(private readonly data: string) {}
  
  *tokenize(): IterableIterator<string> {
    let pos = 0;
    const data = this.data;
    
    while (pos < data.length) {
      // Find next newline
      const nlPos = data.indexOf('\n', pos);
      
      if (nlPos === -1) {
        // No more newlines, yield rest of string
        yield data.slice(pos);
        break;
      } else {
        // Yield line including newline
        yield data.slice(pos, nlPos + 1);
        pos = nlPos + 1;
      }
    }
  }
  
  estimateTokens(): number {
    // Sample first 20 lines to estimate average line length
    let count = 0;
    let totalLen = 0;
    const data = this.data;
    let pos = 0;
    
    for (let i = 0; i < 20 && pos < data.length; i++) {
      const nlPos = data.indexOf('\n', pos);
      if (nlPos === -1) {
        totalLen += data.length - pos;
        count++;
        break;
      }
      totalLen += nlPos - pos + 1;
      count++;
      pos = nlPos + 1;
    }
    
    if (count === 0) return 100;
    
    const avgLineLen = totalLen / count;
    return Math.ceil(data.length / avgLineLen);
  }
}

/**
 * Tokenizer for byte arrays (Uint8Array) as lines.
 * Splits by newline character (0x0A), keeping the newline.
 */
export class ByteLines implements TokenSource<Uint8Array> {
  constructor(private readonly data: Uint8Array) {}
  
  *tokenize(): IterableIterator<Uint8Array> {
    let pos = 0;
    const data = this.data;
    const newline = 0x0A; // '\n'
    
    while (pos < data.length) {
      // Find next newline
      let nlPos = -1;
      for (let i = pos; i < data.length; i++) {
        if (data[i] === newline) {
          nlPos = i;
          break;
        }
      }
      
      if (nlPos === -1) {
        // No more newlines
        yield data.slice(pos);
        break;
      } else {
        // Include newline
        yield data.slice(pos, nlPos + 1);
        pos = nlPos + 1;
      }
    }
  }
  
  estimateTokens(): number {
    // Sample first 20 lines
    let count = 0;
    let totalLen = 0;
    const data = this.data;
    const newline = 0x0A;
    let pos = 0;
    
    for (let i = 0; i < 20 && pos < data.length; i++) {
      let nlPos = -1;
      for (let j = pos; j < data.length; j++) {
        if (data[j] === newline) {
          nlPos = j;
          break;
        }
      }
      
      if (nlPos === -1) {
        totalLen += data.length - pos;
        count++;
        break;
      }
      
      totalLen += nlPos - pos + 1;
      count++;
      pos = nlPos + 1;
    }
    
    if (count === 0) return 100;
    
    const avgLineLen = totalLen / count;
    return Math.ceil(data.length / avgLineLen);
  }
}

/**
 * Helper to create a StringLines tokenizer.
 */
export function lines(data: string): StringLines {
  return new StringLines(data);
}

/**
 * Helper to create a ByteLines tokenizer.
 */
export function byteLines(data: Uint8Array): ByteLines {
  return new ByteLines(data);
}

/**
 * Make string implement TokenSource by default (line-based).
 */
export function tokenizeString(str: string): TokenSource<string> {
  return new StringLines(str);
}

/**
 * Make Uint8Array implement TokenSource by default (line-based).
 */
export function tokenizeBytes(bytes: Uint8Array): TokenSource<Uint8Array> {
  return new ByteLines(bytes);
}

