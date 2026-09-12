import "@tanstack/react-table";

// Lets column definitions carry a plain-string Spanish label for the mobile
// card view in data-table.tsx, since most `header`s are JSX (sort buttons,
// right-aligned wrappers) that can't be read back as text at render time.
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    label?: string;
  }
}
