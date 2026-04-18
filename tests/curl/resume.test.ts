import { describe, it, expect } from 'vitest';
import { renderResume } from '../../src/curl/render';
import { RESUME } from '../../src/data/resume';
import { stripAnsi, visibleWidth } from '../../src/curl/ansi';

describe('renderResume', () => {
  const output = renderResume(RESUME);
  const plain = stripAnsi(output);

  it('contains the name', () => {
    expect(plain).toContain('Luis Salik');
  });

  it('contains each job title and company', () => {
    for (const job of RESUME.experience) {
      expect(plain).toContain(job.title);
      expect(plain).toContain(job.company);
    }
  });

  it('contains job date ranges', () => {
    for (const job of RESUME.experience) {
      expect(plain).toContain(job.dates);
    }
  });

  it('contains education degree and school', () => {
    for (const edu of RESUME.education) {
      expect(plain).toContain(edu.degree);
      expect(plain).toContain(edu.school);
    }
  });

  it('contains every skill category label', () => {
    for (const cat of RESUME.skills) {
      expect(plain).toContain(cat.label);
    }
  });

  it('contains at least one box-drawing glyph', () => {
    expect(output).toMatch(/[┌┐└┘│─]/);
  });

  it('no visible line exceeds 80 columns', () => {
    for (const line of output.split('\n')) {
      expect(visibleWidth(line)).toBeLessThanOrEqual(80);
    }
  });

  it('contains ANSI escape codes', () => {
    expect(output).toContain('\x1b[');
  });

  it('contains a PDF download hint', () => {
    expect(plain).toContain('resume.pdf');
  });
});
