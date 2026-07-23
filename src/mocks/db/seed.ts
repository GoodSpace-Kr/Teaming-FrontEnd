import type { MockStore } from "./store";
import type { UserRecord, MemberRecord, ChatMessageRecord, AssignmentRecord, FileRecord } from "./types";

// 빈 문자열로 두면 각 화면에 이미 있는 폴백 로직(채팅의 이름별 동물 이모지 등)이
// 자연히 동작해서, 실제 이미지 에셋 없이도 유저마다 다르게 보인다.
const AVATAR = "";

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function isoHoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

export function seedStore(store: MockStore): void {
  // --- 유저 ---
  const users: UserRecord[] = [
    { id: 1, email: "demo@teaming.app", name: "김민준", avatarKey: "", avatarVersion: 0, avatarUrl: AVATAR },
    { id: 2, email: "seoyeon@teaming.app", name: "이서연", avatarKey: "", avatarVersion: 0, avatarUrl: AVATAR },
    { id: 3, email: "doyoon@teaming.app", name: "박도윤", avatarKey: "", avatarVersion: 0, avatarUrl: AVATAR },
    { id: 4, email: "jiwoo@teaming.app", name: "최지우", avatarKey: "", avatarVersion: 0, avatarUrl: AVATAR },
    { id: 5, email: "haeun@teaming.app", name: "정하은", avatarKey: "", avatarVersion: 0, avatarUrl: AVATAR },
  ];
  users.forEach((u) => store.users.set(u.id, u));
  store.counters.userId = users.length + 1;

  const member = (userId: number, role: "LEADER" | "MEMBER", opts?: Partial<MemberRecord>): MemberRecord => {
    const u = store.users.get(userId)!;
    return {
      memberId: u.id,
      name: u.name,
      avatarKey: u.avatarKey,
      avatarVersion: u.avatarVersion,
      avatarUrl: u.avatarUrl,
      roomRole: role,
      lastReadMessageId: 0,
      paid: true,
      entered: true,
      ...opts,
    };
  };

  // --- 방 1: 캡스톤 디자인 A팀 (정상 진입 가능, 채팅/과제 데모용) ---
  store.rooms.set(101, {
    roomId: 101,
    title: "캡스톤 디자인 A팀",
    description: "졸업 프로젝트 팀 프로젝트방입니다.",
    imageKey: "",
    imageVersion: 0,
    avatarUrl: "/good_space1.jpg",
    type: { typeName: "BASIC", price: 5000, description: "메가커피 기프티콘" },
    inviteCode: "CAPS101",
    leaderId: 1,
    success: false,
    createdAt: isoDaysFromNow(-14),
  });
  store.roomMembers.set(101, [member(1, "LEADER"), member(2, "MEMBER"), member(3, "MEMBER")]);

  // --- 방 2: 알고리즘 스터디 (데모 유저가 결제 전 상태 -> PaymentModal 플로우 확인용) ---
  store.rooms.set(102, {
    roomId: 102,
    title: "알고리즘 스터디",
    description: "매주 화요일 알고리즘 문제풀이 스터디",
    imageKey: "",
    imageVersion: 0,
    avatarUrl: "/good_space1.jpg",
    type: { typeName: "STANDARD", price: 8000, description: "스타벅스 기프티콘" },
    inviteCode: "ALGO202",
    leaderId: 2,
    success: false,
    createdAt: isoDaysFromNow(-7),
  });
  store.roomMembers.set(102, [
    member(2, "LEADER"),
    member(1, "MEMBER", { paid: false, entered: false }),
    member(4, "MEMBER"),
  ]);

  // --- 방 3: OO 공모전 준비 (정상 진입, 두 번째 데모용 채팅방) ---
  store.rooms.set(103, {
    roomId: 103,
    title: "OO 공모전 준비",
    description: "해커톤 공모전 준비 팀",
    imageKey: "",
    imageVersion: 0,
    avatarUrl: "/good_space1.jpg",
    type: { typeName: "ELITE", price: 12000, description: "스타벅스 기프티콘(대)" },
    inviteCode: "HACK303",
    leaderId: 1,
    success: false,
    createdAt: isoDaysFromNow(-3),
  });
  store.roomMembers.set(103, [member(1, "LEADER"), member(4, "MEMBER"), member(5, "MEMBER")]);

  // --- 방 4: 체험용 DEMO방 (결제 없이 바로 입장) ---
  store.rooms.set(104, {
    roomId: 104,
    title: "체험용 데모방",
    description: "결제 없이 바로 체험할 수 있는 방입니다.",
    imageKey: "",
    imageVersion: 0,
    avatarUrl: "/good_space1.jpg",
    type: { typeName: "DEMO", price: 0, description: "무료 체험" },
    inviteCode: "DEMO404",
    leaderId: 1,
    success: false,
    createdAt: isoDaysFromNow(-1),
  });
  store.roomMembers.set(104, [member(1, "LEADER")]);

  // --- 방 5: 데모 유저가 속하지 않은 방 (초대코드로 "찾기/참여" 플로우 테스트용) ---
  store.rooms.set(105, {
    roomId: 105,
    title: "신입 환영 스터디",
    description: "초대 코드로 참여해보세요",
    imageKey: "",
    imageVersion: 0,
    avatarUrl: "/good_space1.jpg",
    type: { typeName: "STANDARD", price: 6000, description: "메가커피 기프티콘" },
    inviteCode: "WELCOME1",
    leaderId: 5,
    success: false,
    createdAt: isoDaysFromNow(-2),
  });
  store.roomMembers.set(105, [member(5, "LEADER")]);

  store.counters.roomId = 106;

  // --- 채팅 메시지 시드 ---
  const seedMessages = (roomId: number, entries: Array<[senderId: number, content: string, type?: ChatMessageRecord["type"]]>) => {
    const list: ChatMessageRecord[] = entries.map(([senderId, content, type], idx) => {
      const sender = store.users.get(senderId);
      const messageId = store.counters.messageId++;
      return {
        messageId,
        roomId,
        clientMessageId: `seed-${roomId}-${idx}`,
        type: type || "TEXT",
        content,
        createdAt: isoMinutesAgo((entries.length - idx) * 7),
        sender: sender
          ? { id: sender.id, name: sender.name, avatarUrl: sender.avatarUrl, avatarVersion: sender.avatarVersion }
          : { id: null, name: "시스템", avatarUrl: null },
        attachments: [],
        readBy: sender ? [senderId] : [],
      };
    });
    store.messages.set(roomId, list);
  };

  seedMessages(101, [
    [1, "다들 안녕하세요! 캡스톤 팀방입니다.", "SYSTEM_NOTICE"],
    [1, "이번 주까지 기획서 초안 부탁드려요."],
    [2, "넵! 오늘 저녁까지 공유드릴게요."],
    [3, "저는 UI 와이어프레임 작업 중입니다."],
    [2, "화면 설계 다 되면 같이 리뷰해요."],
    [1, "좋아요, 목요일 오후 2시에 미팅 잡을까요?"],
    [3, "저는 가능합니다."],
    [2, "저도 좋아요!"],
  ]);

  seedMessages(102, [
    [2, "다들 안녕하세요! 알고리즘 스터디방입니다.", "SYSTEM_NOTICE"],
    [2, "이번 주 문제는 백준 1932번입니다."],
    [4, "넵 확인했습니다!"],
    [2, "화요일 저녁 8시에 같이 리뷰해요."],
    [4, "좋아요, 그때 뵐게요."],
    [2, "새로운 팀원 결제 대기중이니 곧 합류할 예정입니다."],
    [4, "환영합니다!"],
  ]);

  seedMessages(103, [
    [1, "공모전 팀방 개설했습니다.", "SYSTEM_NOTICE"],
    [4, "주제 후보 3개 정리해서 올릴게요."],
    [5, "저는 참고 자료 찾아볼게요."],
    [1, "발표자료 템플릿은 제가 만들어둘게요."],
    [4, "감사합니다!"],
  ]);

  seedMessages(104, [
    [0, "체험용 데모방에 오신 것을 환영합니다!", "SYSTEM_NOTICE"], // senderId 0 -> 존재하지 않는 유저 -> 시스템 메시지로 처리됨
    [1, "테스트로 메시지를 보내봅니다."],
    [1, "여기서 자유롭게 채팅 기능을 체험해보세요."],
    [1, "파일 업로드나 과제 기능도 사용해볼 수 있어요."],
  ]);

  seedMessages(105, [
    [5, "신입 환영 스터디에 오신 것을 환영합니다!", "SYSTEM_NOTICE"],
    [5, "초대코드로 들어오신 분들은 자유롭게 인사 남겨주세요."],
    [5, "매주 금요일 저녁에 온라인으로 모입니다."],
    [5, "궁금한 점 있으면 편하게 질문해주세요!"],
  ]);

  // --- 과제 시드 ---
  const makeAssignment = (opts: {
    roomId: number;
    title: string;
    description: string;
    assignedMemberIds: number[];
    due: string;
    status: AssignmentRecord["status"];
    creatorId: number;
    createdAt: string;
    submissions?: AssignmentRecord["submissions"];
  }): AssignmentRecord => ({
    assignmentId: store.counters.assignmentId++,
    roomId: opts.roomId,
    title: opts.title,
    description: opts.description,
    assignedMemberIds: opts.assignedMemberIds,
    due: opts.due,
    status: opts.status,
    creatorId: opts.creatorId,
    creatorName: store.users.get(opts.creatorId)?.name || "",
    createdAt: opts.createdAt,
    isCancelled: false,
    submissions: opts.submissions || [],
  });

  store.assignments.set(101, [
    makeAssignment({
      roomId: 101,
      title: "기획서 초안 제출",
      description: "각자 맡은 파트의 기획서 초안을 제출해주세요.",
      assignedMemberIds: [1, 2, 3],
      due: isoHoursFromNow(60), // 3일 이내 -> 주황
      status: "IN_PROGRESS",
      creatorId: 1,
      createdAt: isoDaysFromNow(-2),
    }),
    makeAssignment({
      roomId: 101,
      title: "팀 규칙 정하기",
      description: "팀 운영 규칙 문서를 작성해 제출합니다.",
      assignedMemberIds: [1, 2, 3],
      due: isoDaysFromNow(-1),
      status: "COMPLETED",
      creatorId: 1,
      createdAt: isoDaysFromNow(-6),
      submissions: [
        {
          submitterId: 2,
          description: "팀 규칙 문서 첨부합니다.",
          createdAt: isoDaysFromNow(-2),
          updatedAt: isoDaysFromNow(-2),
          files: [{ fileId: 9001, fileName: "팀규칙.pdf", fileType: "DOCUMENT", mimeType: "application/pdf", fileSize: 20480 }],
        },
      ],
    }),
  ]);

  store.assignments.set(102, [
    makeAssignment({
      roomId: 102,
      title: "1주차 문제풀이 인증",
      description: "각자 푼 문제 스크린샷을 제출해주세요.",
      assignedMemberIds: [1, 2, 4],
      due: isoHoursFromNow(-12), // 마감 지남 -> 빨강
      status: "OVERDUE",
      creatorId: 2,
      createdAt: isoDaysFromNow(-4),
    }),
    makeAssignment({
      roomId: 102,
      title: "2주차 스터디 노트 제출",
      description: "이번 주 풀이 노트를 정리해서 제출해주세요.",
      assignedMemberIds: [1, 2, 4],
      due: isoDaysFromNow(2), // 48시간 -> 주황
      status: "IN_PROGRESS",
      creatorId: 2,
      createdAt: isoDaysFromNow(-1),
    }),
  ]);

  store.assignments.set(103, [
    makeAssignment({
      roomId: 103,
      title: "주제 선정 회의록",
      description: "회의 내용을 정리해서 올려주세요.",
      assignedMemberIds: [1, 4, 5],
      due: isoDaysFromNow(5), // 여유 -> 파랑
      status: "IN_PROGRESS",
      creatorId: 1,
      createdAt: isoDaysFromNow(-1),
    }),
    makeAssignment({
      roomId: 103,
      title: "팀 회의록 정리",
      description: "지난 회의 내용을 문서로 정리해 제출합니다.",
      assignedMemberIds: [1, 4, 5],
      due: isoDaysFromNow(-3),
      status: "COMPLETED",
      creatorId: 1,
      createdAt: isoDaysFromNow(-8),
      submissions: [
        {
          submitterId: 4,
          description: "회의록 정리했습니다.",
          createdAt: isoDaysFromNow(-4),
          updatedAt: isoDaysFromNow(-4),
          files: [{ fileId: 9002, fileName: "회의록_0715.docx", fileType: "DOCUMENT", mimeType: "application/msword", fileSize: 15360 }],
        },
        {
          submitterId: 5,
          description: "저도 정리한 내용 공유드려요.",
          createdAt: isoDaysFromNow(-3),
          updatedAt: isoDaysFromNow(-3),
          files: [],
        },
      ],
    }),
    makeAssignment({
      roomId: 103,
      title: "발표자료 초안 공유",
      description: "발표자료 초안을 작성해서 공유해주세요.",
      assignedMemberIds: [1, 4, 5],
      due: isoHoursFromNow(30), // 3일 이내 -> 주황
      status: "IN_PROGRESS",
      creatorId: 1,
      createdAt: isoDaysFromNow(-1),
      submissions: [
        {
          submitterId: 1,
          description: "초안 작성했습니다. 검토 부탁드려요.",
          createdAt: isoMinutesAgo(120),
          updatedAt: isoMinutesAgo(120),
          files: [{ fileId: 9003, fileName: "발표자료_초안.pptx", fileType: "DOCUMENT", mimeType: "application/vnd.ms-powerpoint", fileSize: 512000 }],
        },
      ],
    }),
  ]);

  store.assignments.set(104, [
    makeAssignment({
      roomId: 104,
      title: "체험 과제 1: 프로필 설정해보기",
      description: "마이페이지에서 프로필 사진과 닉네임을 설정해보세요.",
      assignedMemberIds: [1],
      due: isoDaysFromNow(4),
      status: "IN_PROGRESS",
      creatorId: 1,
      createdAt: isoDaysFromNow(-1),
    }),
    makeAssignment({
      roomId: 104,
      title: "체험 후기 작성",
      description: "티밍 사용 후기를 자유롭게 남겨주세요.",
      assignedMemberIds: [1],
      due: isoDaysFromNow(-2),
      status: "COMPLETED",
      creatorId: 1,
      createdAt: isoDaysFromNow(-5),
      submissions: [
        {
          submitterId: 1,
          description: "채팅이랑 과제 기능이 편리하네요!",
          createdAt: isoDaysFromNow(-3),
          updatedAt: isoDaysFromNow(-3),
          files: [],
        },
      ],
    }),
  ]);

  store.assignments.set(105, [
    makeAssignment({
      roomId: 105,
      title: "환영 인사 작성",
      description: "간단한 자기소개를 채팅방에 남겨주세요.",
      assignedMemberIds: [5],
      due: isoDaysFromNow(3),
      status: "IN_PROGRESS",
      creatorId: 5,
      createdAt: isoDaysFromNow(-1),
    }),
  ]);

  // --- 자료실 파일 시드 ---
  const makeFile = (opts: {
    roomId: number;
    uploaderId: number;
    sortOrder: number;
    name: string;
    type: FileRecord["type"];
    mimeType: string;
    byteSize: number;
    isImage?: boolean;
  }): FileRecord => ({
    fileId: store.counters.fileId++,
    roomId: opts.roomId,
    uploaderId: opts.uploaderId,
    sortOrder: opts.sortOrder,
    name: opts.name,
    type: opts.type,
    mimeType: opts.mimeType,
    byteSize: opts.byteSize,
    width: opts.isImage ? 1200 : null,
    height: opts.isImage ? 800 : null,
    durationMs: null,
    previewUrl: opts.isImage ? "/good_space1.jpg" : null,
    thumbnailUrl: opts.isImage ? "/good_space1.jpg" : null,
    downloadUrl: "/good_space1.jpg",
    antiVirusScanStatus: "PASSED",
    transcodeStatus: "NONE",
    ready: true,
  });

  store.files.set(101, [
    makeFile({ roomId: 101, uploaderId: 1, sortOrder: 0, name: "프로젝트_계획서.pdf", type: "FILE", mimeType: "application/pdf", byteSize: 51200 }),
    makeFile({ roomId: 101, uploaderId: 2, sortOrder: 1, name: "와이어프레임.png", type: "IMAGE", mimeType: "image/png", byteSize: 204800, isImage: true }),
    makeFile({ roomId: 101, uploaderId: 1, sortOrder: 2, name: "발표자료_v2.pptx", type: "FILE", mimeType: "application/vnd.ms-powerpoint", byteSize: 819200 }),
  ]);

  store.files.set(102, [
    makeFile({ roomId: 102, uploaderId: 2, sortOrder: 0, name: "문제풀이_정리.pdf", type: "FILE", mimeType: "application/pdf", byteSize: 30720 }),
    makeFile({ roomId: 102, uploaderId: 4, sortOrder: 1, name: "알고리즘_노트.png", type: "IMAGE", mimeType: "image/png", byteSize: 153600, isImage: true }),
  ]);

  store.files.set(103, [
    makeFile({ roomId: 103, uploaderId: 1, sortOrder: 0, name: "공모전_기획안.pdf", type: "FILE", mimeType: "application/pdf", byteSize: 71680 }),
    makeFile({ roomId: 103, uploaderId: 4, sortOrder: 1, name: "레퍼런스_자료.png", type: "IMAGE", mimeType: "image/png", byteSize: 184320, isImage: true }),
    makeFile({ roomId: 103, uploaderId: 1, sortOrder: 2, name: "발표자료_초안.pptx", type: "FILE", mimeType: "application/vnd.ms-powerpoint", byteSize: 512000 }),
    makeFile({ roomId: 103, uploaderId: 5, sortOrder: 3, name: "타임라인.xlsx", type: "FILE", mimeType: "application/vnd.ms-excel", byteSize: 20480 }),
  ]);

  store.files.set(104, [
    makeFile({ roomId: 104, uploaderId: 1, sortOrder: 0, name: "체험_가이드.pdf", type: "FILE", mimeType: "application/pdf", byteSize: 40960 }),
  ]);

  store.files.set(105, []);

  // --- 기프티콘 시드 (데모 유저) ---
  store.gifticons.set("demo@teaming.app", [
    { code: "MEGA-COFFEE-0001", expirationDate: isoDaysFromNow(30), grade: "BASIC" },
    { code: "STARBUCKS-0002", expirationDate: isoDaysFromNow(60), grade: "STANDARD" },
    { code: "STARBUCKS-ELITE-0003", expirationDate: isoDaysFromNow(45), grade: "ELITE" },
    { code: "MEGA-COFFEE-0004", expirationDate: isoDaysFromNow(10), grade: "BASIC" },
    { code: "STARBUCKS-0005", expirationDate: isoDaysFromNow(90), grade: "STANDARD" },
  ]);
}
