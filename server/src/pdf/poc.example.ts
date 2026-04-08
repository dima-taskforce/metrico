/**
 * @react-pdf/renderer PoC — проверка совместимости с Node.js / NestJS.
 *
 * Запуск вручную:
 *   npx ts-node -e "require('./src/pdf/poc.example')"
 *   или через jest: файл содержит exportable функцию renderHelloWorldPdf().
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1a1a1a',
  },
  section: {
    margin: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#cccccc',
    borderStyle: 'solid',
  },
  text: {
    fontSize: 12,
    lineHeight: 1.5,
    color: '#333333',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    borderBottomStyle: 'solid',
    paddingVertical: 4,
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
  },
  watermark: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    fontSize: 8,
    color: '#cccccc',
  },
});

function HelloWorldDocument(): React.ReactElement {
  return React.createElement(
    Document,
    { title: 'Metrico PoC', author: 'Metrico MVP' },
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.title }, 'Metrico — Обмерный план'),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.text }, 'Проект: Тестовая квартира'),
        React.createElement(Text, { style: styles.text }, 'Дата: 2026-04-09'),
      ),
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(
          View,
          { style: styles.tableRow },
          React.createElement(Text, { style: styles.tableCell }, 'Комната'),
          React.createElement(Text, { style: styles.tableCell }, 'Площадь (м²)'),
          React.createElement(Text, { style: styles.tableCell }, 'Периметр (м)'),
        ),
        React.createElement(
          View,
          { style: styles.tableRow },
          React.createElement(Text, { style: styles.tableCell }, 'Спальня'),
          React.createElement(Text, { style: styles.tableCell }, '20.00'),
          React.createElement(Text, { style: styles.tableCell }, '18.00'),
        ),
        React.createElement(
          View,
          { style: styles.tableRow },
          React.createElement(Text, { style: styles.tableCell }, 'Кухня'),
          React.createElement(Text, { style: styles.tableCell }, '12.50'),
          React.createElement(Text, { style: styles.tableCell }, '14.20'),
        ),
      ),
      React.createElement(Text, { style: styles.watermark }, 'Metrico MVP'),
    ),
  );
}

/**
 * Генерирует тестовый PDF в память и возвращает Buffer.
 * Используется в тестах и при ручной проверке.
 */
export async function renderHelloWorldPdf(): Promise<Buffer> {
  const element = React.createElement(HelloWorldDocument);
  const buffer = await renderToBuffer(element);
  return Buffer.from(buffer);
}
