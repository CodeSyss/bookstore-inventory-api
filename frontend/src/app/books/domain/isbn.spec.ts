import { findIsbnProblem, isValidIsbn, normalizeIsbn } from './isbn';

describe('ISBN domain validation', () => {
  describe('normalizeIsbn', () => {
    it('removes hyphens and whitespace and uppercases the check digit', () => {
      expect(normalizeIsbn(' 0-8044 2957-x ')).toBe('080442957X');
    });
  });

  describe('valid ISBNs', () => {
    it.each([
      ['ISBN-13 with hyphens', '978-84-376-0494-7'],
      ['ISBN-13 without separators', '9780306406157'],
      ['ISBN-13 with spaces', '978 0 306 40615 7'],
      ['ISBN-10 with hyphens', '0-306-40615-2'],
      ['ISBN-10 without separators', '0306406152'],
      ['ISBN-10 ending in X', '080442957X'],
      ['ISBN-10 ending in lowercase x', '080442957x'],
    ])('accepts %s', (_label, isbn) => {
      expect(isValidIsbn(isbn)).toBe(true);
      expect(findIsbnProblem(isbn)).toBeNull();
    });
  });

  describe('wrong check digit', () => {
    it.each([
      ['ISBN-13', '978-84-376-0494-8'],
      ['ISBN-10', '0-306-40615-3'],
      ['ISBN-10 where X was expected', '0804429571'],
    ])('rejects %s with a checksum problem', (_label, isbn) => {
      expect(isValidIsbn(isbn)).toBe(false);
      expect(findIsbnProblem(isbn)).toBe('checksum');
    });
  });

  describe('wrong shape', () => {
    it.each([
      ['empty string', ''],
      ['only separators', ' - - '],
      ['too short', '123456789'],
      ['11 digits', '12345678901'],
      ['14 digits', '97803064061570'],
      ['letters', 'ABCDEFGHIJ'],
      ['X in the middle of an ISBN-10', '08044X957X'],
      ['X in an ISBN-13', '978030640615X'],
    ])('rejects %s with a format problem', (_label, isbn) => {
      expect(isValidIsbn(isbn)).toBe(false);
      expect(findIsbnProblem(isbn)).toBe('format');
    });
  });
});
