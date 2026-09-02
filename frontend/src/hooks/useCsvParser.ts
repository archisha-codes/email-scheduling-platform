import React, { useState } from 'react';
import Papa from 'papaparse';

export interface CsvParseResult {
  validEmails: string[];
  totalDetected: number;
  duplicateCount: number;
  invalidCount: number;
  fileName: string | null;
}

export function useCsvParser() {
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<CsvParseResult>({
    validEmails: [],
    totalDetected: 0,
    duplicateCount: 0,
    invalidCount: 0,
    fileName: null,
  });

  const parseFile = (file: File) => {
    setParsing(true);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        const rawStrings: string[] = [];

        // Flatten CSV rows or text lines
        results.data.forEach((row: any) => {
          if (Array.isArray(row)) {
            row.forEach((cell) => {
              if (typeof cell === 'string') {
                cell.split(/[\s,;]+/).forEach((token) => {
                  const cleaned = token.trim().toLowerCase();
                  if (cleaned) rawStrings.push(cleaned);
                });
              }
            });
          } else if (typeof row === 'string') {
            (row as string).split(/[\s,;]+/).forEach((token) => {
              const cleaned = token.trim().toLowerCase();
              if (cleaned) rawStrings.push(cleaned);
            });
          }
        });

        const valid: string[] = [];
        const seen = new Set<string>();
        let duplicates = 0;
        let invalid = 0;

        rawStrings.forEach((str) => {
          if (emailRegex.test(str)) {
            if (seen.has(str)) {
              duplicates++;
            } else {
              seen.add(str);
              valid.push(str);
            }
          } else {
            invalid++;
          }
        });

        setResult({
          validEmails: valid,
          totalDetected: valid.length,
          duplicateCount: duplicates,
          invalidCount: invalid,
          fileName: file.name,
        });

        setParsing(false);
      },
      error: () => {
        setParsing(false);
      },
    });
  };

  const clearCsv = () => {
    setResult({
      validEmails: [],
      totalDetected: 0,
      duplicateCount: 0,
      invalidCount: 0,
      fileName: null,
    });
  };

  return { parseFile, clearCsv, result, parsing };
}
