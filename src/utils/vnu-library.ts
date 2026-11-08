
import { Book, BookSearchResponse } from '@/types/book.type';

/**
 * Search books from EBSCO/VNU Library
 * Using EBSCO Discovery Service endpoint
 * 
 * ============================================================================
 * HƯỚNG DẪN TÍCH HỢP THỰC (REAL INTEGRATION GUIDE):
 * ============================================================================
 * 
 * Hiện tại đang dùng MOCK DATA để demo. Để tích hợp thật với EBSCO:
 * 
 * BƯỚC 1: Tạo backend scraper
 *   - Xem file: /BACKEND_SCRAPER_SETUP.md để biết chi tiết
 *   - Chạy backend service trên port 3001
 * 
 * BƯỚC 2: Uncomment OPTION 2 bên dưới (Backend Proxy)
 *   - Comment lại OPTION 3 (mock data)
 *   - Đảm bảo backend đang chạy ở http://localhost:3001
 * 
 * BƯỚC 3: Update backend URL nếu deploy
 *   - Thay 'http://localhost:3001' bằng domain thực của backend
 *   - VD: 'https://api.yourdomain.com' hoặc process.env.VITE_APP_BACKEND_URL
 * 
 * LƯU Ý:
 *   - EBSCO có thể yêu cầu authentication
 *   - Cần kiểm tra Terms of Service trước khi scrape
 *   - Implement rate limiting để tránh bị block
 * 
 * ============================================================================
 */
export const searchVNULibrary = async (
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<BookSearchResponse> => {
  try {
    // OPTION 1: Direct EBSCO API call (may face CORS issues)
    // Uncomment this when you have a backend proxy or CORS is enabled
    /*
    const response = await axios.get('https://research.ebsco.com/c/wsq2qv/search/results', {
      params: {
        q: query,
        autocorrect: 'y',
        expanders: ['thesaurus', 'fullText', 'concept'],
        limiters: 'None',
        searchMode: 'all',
        searchSegment: 'all-results',
        page: page,
      },
      timeout: 15000,
      headers: {
        'Accept': 'application/json, text/html',
      }
    });
    
    const books = parseEBSCOResponse(response.data);
    return {
      books,
      total: books.length,
      page,
      hasMore: books.length === limit,
    };
    */

    // OPTION 2: Backend Proxy approach (recommended)
    // Uncomment this when you have a backend service ready
    /*
    const response = await axios.get('http://localhost:3000/api/search-library', {
      params: { query, page, limit },
      timeout: 15000,
    });
    
    return response.data; // Backend should return BookSearchResponse format
    */

    // OPTION 3: For now, use mock data for demonstration
    console.log(`Searching for: "${query}" on page ${page}`);
    return getMockBooks(query, page, limit);
    
  } catch (error) {
    console.error('Error searching library:', error);
    
    // Fallback to mock data
    return getMockBooks(query, page, limit);
  }
};

// /**
//  * Parse books from EBSCO response
//  * This function parses EBSCO Discovery Service API responses
//  */
// const parseEBSCOResponse = (data: any): Book[] => {
//   try {
//     // EBSCO typically returns data in Records or Items array
//     const records = data?.Records || data?.SearchResult?.Data?.Records || [];
    
//     if (!Array.isArray(records)) {
//       console.warn('EBSCO response does not contain expected Records array');
//       return [];
//     }

//     return records.map((record: any, index: number) => {
//       // Extract bibliographic data
//       const header = record.Header || {};
//       const items = record.Items || [];
//       const recordInfo = record.RecordInfo || {};
      
//       // Find title
//       const titleItem = items.find((item: any) => item.Name === 'Title' || item.Label === 'Title');
//       const title = titleItem?.Data || header.DbLabel || `Unknown Title ${index + 1}`;
      
//       // Find author
//       const authorItem = items.find((item: any) => item.Name === 'Author' || item.Label === 'Authors');
//       const author = authorItem?.Data || 'Unknown Author';
      
//       // Find other metadata
//       const publisherItem = items.find((item: any) => item.Name === 'Publisher' || item.Label === 'Publisher');
//       const yearItem = items.find((item: any) => item.Name === 'Date' || item.Label === 'Publication Year');
//       const isbnItem = items.find((item: any) => item.Name === 'ISBN' || item.Label === 'ISBN');
//       const abstractItem = items.find((item: any) => item.Name === 'Abstract' || item.Label === 'Abstract');
      
//       // Get cover image
//       const imageInfo = record.ImageInfo || {};
//       const coverImage = imageInfo.CoverArt?.[0]?.Url || imageInfo.ImageUrl;

//       return {
//         id: header.An || recordInfo.BibEntity?.Identifiers?.[0]?.Value || `ebsco-${index}`,
//         title: cleanHTML(title),
//         author: cleanHTML(author),
//         publisher: publisherItem ? cleanHTML(publisherItem.Data) : undefined,
//         year: yearItem ? cleanHTML(yearItem.Data) : undefined,
//         isbn: isbnItem ? cleanHTML(isbnItem.Data) : undefined,
//         coverImage: coverImage,
//         description: abstractItem ? cleanHTML(abstractItem.Data) : undefined,
//         availability: 'available', // EBSCO may not provide real-time availability
//         location: header.DbLabel || 'EBSCO Database',
//         callNumber: header.PubId,
//       };
//     });
//   } catch (error) {
//     console.error('Error parsing EBSCO response:', error);
//     return [];
//   }
// };

// /**
//  * Clean HTML tags and entities from text
//  */
// const cleanHTML = (text: string): string => {
//   if (!text) return '';
//   return text
//     .replace(/<[^>]*>/g, '') // Remove HTML tags
//     .replace(/&nbsp;/g, ' ')
//     .replace(/&amp;/g, '&')
//     .replace(/&lt;/g, '<')
//     .replace(/&gt;/g, '>')
//     .replace(/&quot;/g, '"')
//     .trim();
// };

/**
 * Mock books data for demonstration
 * Remove this function once real API is integrated
 */
const getMockBooks = (query: string, page: number = 1, limit: number = 20): BookSearchResponse => {
  const allMockBooks: Book[] = [
    {
      id: '1',
      title: `"${query}" - Sách 1`,
      author: 'Tác giả A, Tác giả B',
      publisher: 'Nhà xuất bản Giáo dục',
      year: '2023',
      isbn: '978-604-0-12345-6',
      coverImage: 'https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.shutterstock.com%2Fsearch%2Fhand-holding-book-mockup&psig=AOvVaw2WOUxgmYGJDnid540skTt5&ust=1762707906076000&source=images&cd=vfe&opi=89978449&ved=0CBUQjRxqFwoTCIjhkuiE45ADFQAAAAAdAAAAABAL',
      description: 'Mô tả chi tiết về cuốn sách này. Đây là một tài liệu quan trọng trong lĩnh vực nghiên cứu.',
      availability: 'available',
      location: 'Thư viện Tổng hợp - Tầng 2',
      callNumber: 'QA76.73.P98 T45 2023',
    },
    {
      id: '2',
      title: `${query} - Lý thuyết và Thực hành`,
      author: 'Nguyễn Văn A',
      publisher: 'Nhà xuất bản Đại học Quốc gia TP.HCM',
      year: '2022',
      isbn: '978-604-0-54321-7',
      coverImage: 'https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.shutterstock.com%2Fsearch%2Fhand-holding-book-mockup&psig=AOvVaw2WOUxgmYGJDnid540skTt5&ust=1762707906076000&source=images&cd=vfe&opi=89978449&ved=0CBUQjRxqFwoTCIjhkuiE45ADFQAAAAAdAAAAABAL',
      description: 'Cuốn sách cung cấp kiến thức toàn diện về chủ đề với nhiều ví dụ thực tế.',
      availability: 'borrowed',
      location: 'Thư viện Khoa học Tự nhiên',
      callNumber: 'TA168 .N49 2022',
    },
    {
      id: '3',
      title: `Giáo trình ${query}`,
      author: 'PGS.TS. Trần Thị B',
      publisher: 'Nhà xuất bản Bách Khoa',
      year: '2024',
      isbn: '978-604-0-98765-4',
      coverImage: 'https://via.placeholder.com/150x200?text=Book+3',
      description: 'Giáo trình dành cho sinh viên đại học, được biên soạn theo chuẩn quốc tế.',
      availability: 'available',
      location: 'Thư viện Tổng hợp - Tầng 3',
      callNumber: 'QC21.3 .T73 2024',
    },
    {
      id: '4',
      title: `Advanced ${query} Techniques`,
      author: 'John Smith, Jane Doe',
      publisher: 'International Publishing House',
      year: '2023',
      isbn: '978-1-234-56789-0',
      coverImage: 'https://via.placeholder.com/150x200?text=Book+4',
      description: 'An comprehensive guide to advanced techniques and methodologies.',
      availability: 'reserved',
      location: 'Main Library - Floor 4',
      callNumber: 'HD30.28 .S65 2023',
    },
    {
      id: '5',
      title: `${query} - Introduction and Applications`,
      author: 'Robert Johnson',
      publisher: 'Academic Press',
      year: '2022',
      isbn: '978-0-123-45678-9',
      coverImage: 'https://via.placeholder.com/150x200?text=Book+5',
      description: 'Comprehensive introduction to the subject with practical examples and case studies.',
      availability: 'available',
      location: 'Engineering Library',
      callNumber: 'TK5105 .J64 2022',
    },
    {
      id: '6',
      title: `Phát triển ứng dụng ${query}`,
      author: 'Lê Văn C, Phạm Thị D',
      publisher: 'NXB Thông tin và Truyền thông',
      year: '2023',
      coverImage: 'https://via.placeholder.com/150x200?text=Book+6',
      description: 'Hướng dẫn chi tiết về phát triển ứng dụng từ cơ bản đến nâng cao.',
      availability: 'available',
      location: 'Thư viện Công nghệ Thông tin',
      callNumber: 'QA76.76 .L38 2023',
    },
  ];

  // Simulate pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedBooks = allMockBooks.slice(startIndex, endIndex);

  return {
    books: paginatedBooks,
    total: allMockBooks.length,
    page: page,
    hasMore: endIndex < allMockBooks.length,
  };
};
