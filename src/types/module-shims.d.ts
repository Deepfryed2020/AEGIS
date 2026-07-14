declare module 'node-fetch' {
  const fetch: any;
  export default fetch;
}

declare module 'xml2js' {
  export function parseStringPromise(xml: string): Promise<any>;
}

declare module 'pdf-parse' {
  const pdfParse: any;
  export default pdfParse;
}

declare module 'papaparse' {
  const Papa: any;
  export default Papa;
}

declare module 'uuid' {
  export function v4(): string;
}
