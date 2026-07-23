import type { MockStore } from "./store";
import type { UserRecord, MemberRecord, ChatMessageRecord, AssignmentRecord, FileRecord } from "./types";

const AVATAR = "/basicProfile.webp";

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
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
  store.roomMembers.set(101, [
    member(1, "LEADER"),
    member(2, "MEMBER"),
    member(3, "MEMBER"),
  ]);

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
  store.roomMembers.set(103, [
    member(1, "LEADER"),
    member(4, "MEMBER"),
    member(5, "MEMBER"),
  ]);

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

  // --- 채팅 메시지 시드 (방 101, 103) ---
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
        readBy: [senderId],
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

  seedMessages(103, [
    [1, "공모전 팀방 개설했습니다.", "SYSTEM_NOTICE"],
    [4, "주제 후보 3개 정리해서 올릴게요."],
    [5, "저는 참고 자료 찾아볼게요."],
    [1, "발표자료 템플릿은 제가 만들어둘게요."],
    [4, "감사합니다!"],
  ]);

  store.messages.set(102, []);
  store.messages.set(104, [
    {
      messageId: store.counters.messageId++,
      roomId: 104,
      clientMessageId: "seed-104-0",
      type: "SYSTEM_NOTICE",
      content: "체험용 데모방에 오신 것을 환영합니다!",
      createdAt: isoMinutesAgo(5),
      sender: { id: null, name: "시스템", avatarUrl: null },
      attachments: [],
      readBy: [1],
    },
  ]);
  store.messages.set(105, []);

  // --- 과제 시드 (방 101, 103) ---
  const assignment101a: AssignmentRecord = {
    assignmentId: store.counters.assignmentId++,
    roomId: 101,
    title: "기획서 초안 제출",
    description: "각자 맡은 파트의 기획서 초안을 제출해주세요.",
    assignedMemberIds: [1, 2, 3],
    due: isoDaysFromNow(3),
    status: "IN_PROGRESS",
    creatorId: 1,
    creatorName: "김민준",
    createdAt: isoDaysFromNow(-2),
    isCancelled: false,
    submissions: [],
  };
  const assignment101b: AssignmentRecord = {
    assignmentId: store.counters.assignmentId++,
    roomId: 101,
    title: "팀 규칙 정하기",
    description: "팀 운영 규칙 문서를 작성해 제출합니다.",
    assignedMemberIds: [1, 2, 3],
    due: isoDaysFromNow(-1),
    status: "COMPLETED",
    creatorId: 1,
    creatorName: "김민준",
    createdAt: isoDaysFromNow(-6),
    isCancelled: false,
    submissions: [
      {
        submitterId: 2,
        description: "팀 규칙 문서 첨부합니다.",
        createdAt: isoDaysFromNow(-2),
        updatedAt: isoDaysFromNow(-2),
        files: [{ fileId: 9001, fileName: "팀규칙.pdf", fileType: "DOCUMENT", mimeType: "application/pdf", fileSize: 20480 }],
      },
    ],
  };
  store.assignments.set(101, [assignment101a, assignment101b]);

  store.assignments.set(103, [
    {
      assignmentId: store.counters.assignmentId++,
      roomId: 103,
      title: "주제 선정 회의록",
      description: "회의 내용을 정리해서 올려주세요.",
      assignedMemberIds: [1, 4, 5],
      due: isoDaysFromNow(5),
      status: "IN_PROGRESS",
      creatorId: 1,
      creatorName: "김민준",
      createdAt: isoDaysFromNow(-1),
      isCancelled: false,
      submissions: [],
    },
  ]);
  store.assignments.set(102, []);
  store.assignments.set(104, []);
  store.assignments.set(105, []);

  // --- 자료실 파일 시드 (방 101) ---
  const files101: FileRecord[] = [
    {
      fileId: store.counters.fileId++,
      roomId: 101,
      uploaderId: 1,
      sortOrder: 0,
      name: "프로젝트_계획서.pdf",
      type: "FILE",
      mimeType: "application/pdf",
      byteSize: 51200,
      width: null,
      height: null,
      durationMs: null,
      previewUrl: null,
      thumbnailUrl: null,
      downloadUrl: "/good_space1.jpg",
      antiVirusScanStatus: "PASSED",
      transcodeStatus: "NONE",
      ready: true,
    },
    {
      fileId: store.counters.fileId++,
      roomId: 101,
      uploaderId: 2,
      sortOrder: 1,
      name: "와이어프레임.png",
      type: "IMAGE",
      mimeType: "image/png",
      byteSize: 204800,
      width: 1200,
      height: 800,
      durationMs: null,
      previewUrl: "/good_space1.jpg",
      thumbnailUrl: "/good_space1.jpg",
      downloadUrl: "/good_space1.jpg",
      antiVirusScanStatus: "PASSED",
      transcodeStatus: "NONE",
      ready: true,
    },
  ];
  store.files.set(101, files101);
  store.files.set(102, []);
  store.files.set(103, []);
  store.files.set(104, []);
  store.files.set(105, []);

  // --- 기프티콘 시드 (데모 유저) ---
  store.gifticons.set("demo@teaming.app", [
    { code: "MEGA-COFFEE-0001", expirationDate: isoDaysFromNow(30), grade: "BASIC" },
    { code: "STARBUCKS-0002", expirationDate: isoDaysFromNow(60), grade: "STANDARD" },
  ]);
}
