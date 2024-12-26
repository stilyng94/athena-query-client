import path from "node:path";
import type { JsonFileAppenderOptions } from "./types.js";
import { createWriteStream } from "node:fs";
import { access, mkdir, stat, writeFile } from "node:fs/promises";

/**
 *@description Handles appending JSON data to files with proper formatting
 */
export class JsonFileAppender {
  #isFirstWrite = true;

  /**
   *@description Creates a new JsonFileAppender instance
   * @param {AppendOptions} options - Configuration options
   */
  constructor(private readonly options: JsonFileAppenderOptions) {}

  /**
   *@description Flushes the current batch of data to the file
   * @param {unknown[]} currentBatch - Array of items to write
   * @returns {Promise<void>}
   */
  async flush(currentBatch: unknown[]): Promise<void> {
    console.log(
      `Flushing batch of ${currentBatch.length} items to ${this.options.fileName}`
    );
    await this.#ensureDirectoryExists(this.options.directory);
    const filePath = path.join(this.options.directory, this.options.fileName);
    await this.#initializeFile(filePath);

    const writeStream = createWriteStream(filePath, {
      flags: "a",
    });

    try {
      for (let i = 0; i < currentBatch.length; i++) {
        const item = currentBatch[i];
        // Add comma if not first item and not first write
        if (!this.#isFirstWrite || i > 0) {
          writeStream.write(",\n");
        }

        writeStream.write(JSON.stringify(item, null));
      }

      this.#isFirstWrite = false;
      console.log(`Successfully flushed ${currentBatch.length} items`);
    } catch (error) {
      console.error("Error while flushing data:", error);
      throw error;
    } finally {
      writeStream.end();
    }
  }

  /**
   *@description Initializes the file with proper JSON array structure
   * @param {string} filePath - Path to the file to initialize
   * @returns {Promise<void>}
   */
  async #initializeFile(filePath: string): Promise<void> {
    try {
      await access(filePath);
      // File exists, check if it's empty or has content
      const statistics = await stat(filePath);
      this.#isFirstWrite = statistics.size === 0;
      console.log(
        `File exists. Size: ${statistics.size} bytes. First write: ${
          this.#isFirstWrite
        }`
      );
    } catch {
      // File doesn't exist, create it with initial array bracket
      console.log(`Creating new file: ${filePath}`);
      await writeFile(filePath, "[\n", "utf-8");
      this.#isFirstWrite = true;
    }
  }

  /**
   *@description Ensures the specified directory exists, creates if it doesn't
   * @param {string} directory - Directory path to check/create
   * @returns {Promise<void>}
   */
  async #ensureDirectoryExists(directory: string): Promise<void> {
    try {
      await access(directory);
      console.log(`Directory ${directory} exists`);
    } catch {
      await mkdir(directory, { recursive: true });
      console.log(`Created directory ${directory}`);
    }
  }

  /**
   * @description Adds closing bracket to JSON array file
   * @param {string} fileName - File to add closing bracket
   * @param {string} directory - Directory of file
   * @returns {void}
   */
  static closeFileWithBracket(fileName: string, directory: string): void {
    const filePath = path.join(directory, fileName);
    console.log(`Closing JSON array in file: ${filePath}`);
    const writeStream = createWriteStream(filePath, { flags: "a" });
    try {
      writeStream.write("\n]");
    } catch (error) {
      console.error("Error while closing JSON array:", error);
      throw error;
    } finally {
      writeStream.end();
    }
  }
}
