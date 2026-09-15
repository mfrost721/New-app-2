#!/usr/bin/env tsx
import { generateContentReport, formatReportText } from '../lib/music/contentReport';

function main() {
  const report = generateContentReport();
  const text = formatReportText(report);
  console.log(text);
}

main();
