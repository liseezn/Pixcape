/// <reference types="vite/client" />

// TypeScript 7 checks side-effect imports strictly; Vite processes CSS at build time.
declare module '*.css' {
  const stylesheet: string
  export default stylesheet
}
