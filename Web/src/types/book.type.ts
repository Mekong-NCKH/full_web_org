export interface Book {
  id: string;
  title: string;
  author: string;
  publisher?: string;
  year?: string;
  isbn?: string;
  coverImage?: string;
  description?: string;
  availability?: 'available' | 'borrowed' | 'reserved';
  location?: string;
  callNumber?: string;
}

export interface BookSearchResponse {
  books: Book[];
  total: number;
  page: number;
  hasMore: boolean;
}
