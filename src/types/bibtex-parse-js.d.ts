declare module 'bibtex-parse-js' {
  export interface BibTeXEntry {
    citationKey: string;
    entryType: string;
    entryTags: Record<string, string>;
  }

  export interface BibTeXParse {
    toJSON(input: string): BibTeXEntry[];
  }

  const bibtexParse: BibTeXParse;
  export default bibtexParse;
}