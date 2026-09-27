const SPREADSHEET_ID = '1909OPBoyEYwfHn66x3qmFEUphH4ZQbul266Tyl2Iq6I';
const SHEET_NAME = 'Responses';

const ANSWER_KEY = {
  module1: [
    'D', 'B', 'B', 'A', 'D', 'A', 'A', 'A', 'A',
    'B', 'A', 'B', 'D', 'A', 'C', 'C', 'D', 'A',
    'A', 'B', 'B', 'C', 'D', 'D', 'C', 'D', 'C'
  ],
  module2: [
    'C', 'B', 'C', 'D', 'A', 'C', 'A', 'D', 'A',
    'B', 'B', 'A', 'A', 'A', 'C', 'A', 'C', 'B',
    'A', 'A', 'D', 'D', 'A', 'C', 'D', 'D', 'B'
  ]
};

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const module1Answers = normalizeAnswers(payload.answers && payload.answers.module1);
  const module2Answers = normalizeAnswers(payload.answers && payload.answers.module2);
  const module1Score = scoreModule(module1Answers, ANSWER_KEY.module1);
  const module2Score = scoreModule(module2Answers, ANSWER_KEY.module2);
  const totalScore = module1Score + module2Score;
  const satEstimate = estimateRwScore(totalScore);
  const satEstimateRange = estimateRwScoreRange(satEstimate);

  const sheet = getResponseSheet();
  ensureHeaders(sheet);

  const rowValues = {
    'Timestamp': new Date(),
    'Test Name': payload.testName || 'SAT Reading and Writing Practice Test 2 - Aug-Oct 2026 (Module 2 Harder)',
    'Student Name': payload.studentName || '',
    'Student Email or ID': payload.studentId || '',
    'Started At': payload.startedAt || '',
    'Submitted At': payload.submittedAt || '',
    'Module 1 Score': `${module1Score}/27`,
    'Module 2 Score': `${module2Score}/27`,
    'Total Score': `${totalScore}/54`,
    'SAT Estimate': satEstimate,
    'SAT Estimate Range': satEstimateRange
  };

  for (let i = 1; i <= 27; i += 1) {
    rowValues[`M1_Q${i}`] = module1Answers[i - 1];
    rowValues[`M1_Q${i}_CORRECT`] = ANSWER_KEY.module1[i - 1];
    rowValues[`M2_Q${i}`] = module2Answers[i - 1];
    rowValues[`M2_Q${i}_CORRECT`] = ANSWER_KEY.module2[i - 1];
  }

  appendRowByHeader(sheet, rowValues);
  formatCorrectAnswerColumns(sheet);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService
    .createTextOutput('SAT Reading and Writing response endpoint is active.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function getResponseSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    const headers = buildHeaders();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    fillExistingCorrectAnswers(sheet);
    formatCorrectAnswerColumns(sheet);
    return;
  }

  ensureSatEstimateColumns(sheet);
  ensureCorrectAnswerColumns(sheet);
  fillExistingCorrectAnswers(sheet);
  formatCorrectAnswerColumns(sheet);
  sheet.setFrozenRows(1);
}

function buildHeaders() {
  const headers = [
    'Timestamp',
    'Test Name',
    'Student Name',
    'Student Email or ID',
    'Started At',
    'Submitted At',
    'Module 1 Score',
    'Module 2 Score',
    'Total Score',
    'SAT Estimate',
    'SAT Estimate Range'
  ];

  for (let i = 1; i <= 27; i += 1) {
    headers.push(`M1_Q${i}`);
    headers.push(`M1_Q${i}_CORRECT`);
  }

  for (let i = 1; i <= 27; i += 1) {
    headers.push(`M2_Q${i}`);
    headers.push(`M2_Q${i}_CORRECT`);
  }

  return headers;
}

function getHeaders(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
}

function ensureSatEstimateColumns(sheet) {
  const headers = getHeaders(sheet);
  const hasSatEstimate = headers.indexOf('SAT Estimate') !== -1;
  const hasSatEstimateRange = headers.indexOf('SAT Estimate Range') !== -1;

  if (!hasSatEstimate && !hasSatEstimateRange) {
    const m1Q1Index = headers.indexOf('M1_Q1');
    const insertBeforeColumn = m1Q1Index === -1 ? 10 : m1Q1Index + 1;
    sheet.insertColumnsBefore(insertBeforeColumn, 2);
    sheet.getRange(1, insertBeforeColumn, 1, 2).setValues([[
      'SAT Estimate',
      'SAT Estimate Range'
    ]]);
  }
}

function ensureCorrectAnswerColumns(sheet) {
  for (let i = 27; i >= 1; i -= 1) {
    ensureCorrectAnswerColumn(sheet, `M2_Q${i}`, `M2_Q${i}_CORRECT`);
  }

  for (let i = 27; i >= 1; i -= 1) {
    ensureCorrectAnswerColumn(sheet, `M1_Q${i}`, `M1_Q${i}_CORRECT`);
  }
}

function ensureCorrectAnswerColumn(sheet, answerHeader, correctHeader) {
  const headers = getHeaders(sheet);
  const answerIndex = headers.indexOf(answerHeader);
  const correctIndex = headers.indexOf(correctHeader);

  if (answerIndex === -1 || correctIndex !== -1) return;

  const answerColumn = answerIndex + 1;
  sheet.insertColumnAfter(answerColumn);
  sheet.getRange(1, answerColumn + 1).setValue(correctHeader);
}

function fillExistingCorrectAnswers(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  for (let i = 1; i <= 27; i += 1) {
    fillCorrectAnswerColumn(sheet, `M1_Q${i}_CORRECT`, ANSWER_KEY.module1[i - 1]);
    fillCorrectAnswerColumn(sheet, `M2_Q${i}_CORRECT`, ANSWER_KEY.module2[i - 1]);
  }
}

function fillCorrectAnswerColumn(sheet, header, correctAnswer) {
  const headers = getHeaders(sheet);
  const columnIndex = headers.indexOf(header);
  if (columnIndex === -1) return;

  const column = columnIndex + 1;
  const rowCount = sheet.getLastRow() - 1;
  sheet.getRange(2, column, rowCount, 1).setValue(correctAnswer);
}

function formatCorrectAnswerColumns(sheet) {
  const headers = getHeaders(sheet);

  headers.forEach((header, index) => {
    if (!String(header).endsWith('_CORRECT')) return;

    const column = index + 1;
    sheet.setColumnWidth(column, 56);
    sheet.getRange(1, column, sheet.getMaxRows(), 1)
      .setBackground('#d9ead3')
      .setFontColor('#000000')
      .setHorizontalAlignment('center');
    sheet.getRange(1, column)
      .setBackground('#93c47d')
      .setFontWeight('bold');
  });
}

function appendRowByHeader(sheet, rowValues) {
  const headers = getHeaders(sheet);
  const row = headers.map(header => {
    return Object.prototype.hasOwnProperty.call(rowValues, header) ? rowValues[header] : '';
  });

  sheet.appendRow(row);
}

function setupSheet() {
  ensureHeaders(getResponseSheet());
}

function normalizeAnswers(answers) {
  const normalized = Array.isArray(answers) ? answers.slice(0, 27) : [];
  while (normalized.length < 27) normalized.push('');
  return normalized.map(answer => String(answer || '').trim().toUpperCase());
}

function scoreModule(studentAnswers, key) {
  return key.reduce((total, correct, index) => {
    return total + (studentAnswers[index] === correct ? 1 : 0);
  }, 0);
}

function estimateRwScore(rawScore) {
  const clampedRawScore = Math.max(0, Math.min(54, Number(rawScore) || 0));
  const center = 200 + (clampedRawScore / 54) * 600;
  return Math.round(center);
}

function estimateRwScoreRange(satEstimate) {
  const low = Math.max(200, satEstimate - 40);
  const high = Math.min(800, satEstimate + 40);
  return `${low}-${high}`;
}
