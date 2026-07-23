export interface UserRecord {
  id: number;
  email: string;
  name: string;
  avatarKey: string;
  avatarVersion: number;
  avatarUrl: string;
}

export interface MemberRecord {
  memberId: number; // = userId, 앱 전반에서 memberId와 userId를 동일하게 취급
  name: string;
  avatarKey: string;
  avatarVersion: number;
  avatarUrl: string;
  roomRole: "LEADER" | "MEMBER";
  lastReadMessageId: number;
  paid: boolean;
  entered: boolean;
}

export interface RoomRecord {
  roomId: number;
  title: string;
  description: string;
  imageKey: string;
  imageVersion: number;
  avatarUrl: string;
  type: { typeName: "BASIC" | "STANDARD" | "ELITE" | "DEMO"; price: number; description: string };
  inviteCode: string;
  leaderId: number;
  success: boolean;
  createdAt: string;
}

export interface MessageAttachmentRecord {
  fileId: number;
  uploaderId: number;
  sortOrder: number;
  name: string;
  type: "IMAGE" | "FILE" | "VIDEO" | "AUDIO";
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  previewUrl: string | null;
  thumbnailUrl: string | null;
  downloadUrl: string | null;
  antiVirusScanStatus: "PENDING" | "PASSED" | "FAILED" | "INFECTED";
  transcodeStatus: "NONE" | "PENDING" | "COMPLETED" | "FAILED";
  ready: boolean;
}

export interface ChatMessageRecord {
  messageId: number;
  roomId: number;
  clientMessageId: string;
  type: "TEXT" | "IMAGE" | "FILE" | "VIDEO" | "AUDIO" | "SYSTEM_NOTICE";
  content: string | null;
  createdAt: string;
  sender: { id: number | null; name: string; avatarUrl: string | null; avatarVersion?: number };
  attachments: MessageAttachmentRecord[];
  readBy: number[];
}

export interface SubmissionFileRecord {
  fileId: number;
  fileName: string;
  fileType: "IMAGE" | "DOCUMENT" | "VIDEO" | "AUDIO" | "OTHER";
  mimeType: string;
  fileSize: number;
}

export interface SubmissionRecord {
  submitterId: number;
  description: string;
  createdAt: string;
  updatedAt: string;
  files: SubmissionFileRecord[];
}

export interface AssignmentRecord {
  assignmentId: number;
  roomId: number;
  title: string;
  description: string;
  assignedMemberIds: number[];
  due: string;
  status: "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | "CANCELED";
  creatorId: number;
  creatorName: string;
  createdAt: string;
  isCancelled: boolean;
  submissions: SubmissionRecord[];
}

// 자료실(dataroom) 파일. 채팅 첨부/아바타 업로드도 같은 레코드 형태를 재사용한다.
export interface FileRecord {
  fileId: number;
  roomId: number;
  uploaderId: number;
  sortOrder: number;
  name: string;
  type: "IMAGE" | "FILE" | "VIDEO" | "AUDIO";
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  previewUrl: string | null;
  thumbnailUrl: string | null;
  downloadUrl: string | null;
  antiVirusScanStatus: "PENDING" | "PASSED" | "FAILED" | "INFECTED";
  transcodeStatus: "NONE" | "PENDING" | "COMPLETED" | "FAILED";
  ready: boolean;
}

export interface GifticonRecord {
  code: string;
  expirationDate: string;
  grade: "BASIC" | "STANDARD" | "ELITE";
}

export interface PendingUpload {
  key: string;
  roomId: number | null; // 아바타 업로드는 roomId 없음(유저 아바타) 또는 방 아바타면 roomId 있음
  ownerType: "USER" | "ROOM" | "CHAT" | "ASSIGNMENT";
  contentType: string;
  fileName: string;
  size: number;
}
