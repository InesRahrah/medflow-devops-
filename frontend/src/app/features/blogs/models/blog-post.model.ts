export interface BlogPost {
  id: number;
  title: string;
  content: string;
  summary: string;
  authorId: any;
  authorName: string;
  category: string;
  coverImageUrl: string;
  status: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  imageUrls: string[];       // ← ADD
  videoUrls: string[];       // ← ADD
  attachmentUrls: string[];  // ← ADD
  referenceLinks: string[];  // ← ADD

  
}