import { db } from '../src/libs/drizzleClient.lib';
import { usersTable } from '../src/models/user.model';
import { topicsTable } from '../src/models/topic.model';
import { questionsTable } from '../src/models/question.model';
import { flashcardsTable } from '../src/models/flashcard.model';

async function seed() {
  console.log('🌱 Seeding database...');

  // Xoá dữ liệu cũ (tuỳ chọn)
  const database = db();
  await database.delete(questionsTable);
  await database.delete(flashcardsTable);
  await database.delete(topicsTable);
  await database.delete(usersTable);

  // Tạo users
  const users = await database.insert(usersTable).values([
    { username: 'alice', email: 'alice@example.com', passwordHash: '123' },
    { username: 'bob', email: 'bob@example.com', passwordHash: '123' },
    { username: 'carol', email: 'carol@example.com', passwordHash: '123' },
    { username: 'dave', email: 'dave@example.com', passwordHash: '123' },
    { username: 'eve', email: 'eve@example.com', passwordHash: '123' },
  ]).returning();

  // Tạo topics
  const topics = await database.insert(topicsTable).values([
    { userId: users[0].userId, name: 'Math', description: 'Basic math' },
    { userId: users[1].userId, name: 'History', description: 'Vietnamese history' },
    { userId: users[2].userId, name: 'Biology', description: 'Plants and animals' },
    { userId: users[3].userId, name: 'Tech', description: 'AI and Blockchain' },
    { userId: users[4].userId, name: 'Literature', description: 'Poetry' },
  ]).returning();

  // Tạo flashcards
  await database.insert(flashcardsTable).values([
    {
      topicId: topics[0].topicId,
      front: '2 + 2 = ?',
      back: '4',
      status: 'new'
    },
    {
      topicId: topics[1].topicId,
      front: 'Năm độc lập của Việt Nam?',
      back: '1945',
      status: 'new'
    },
    {
      topicId: topics[2].topicId,
      front: 'Thực vật sử dụng gì để quang hợp?',
      back: 'Ánh sáng',
      status: 'new'
    },
    {
      topicId: topics[3].topicId,
      front: 'Ngôn ngữ phổ biến cho AI?',
      back: 'Python',
      status: 'new'
    },
    {
      topicId: topics[4].topicId,
      front: 'Tác giả Truyện Kiều?',
      back: 'Nguyễn Du',
      status: 'new'
    },
  ]);

  // Tạo questions
  await database.insert(questionsTable).values([
    {
      topicId: topics[0].topicId,
      questionText: 'Kết quả của 1 + 1 là gì?',
      choices: ['1', '2', '3', '4'],
      correctIndex: 3,
      status: 'new'
    },
    {
      topicId: topics[1].topicId,
      questionText: 'Năm Bác Hồ đọc Tuyên ngôn Độc lập?',
      choices: ['1945', '1954', '1975', '1986'],
      correctIndex: 0,
      status: 'new'
    },
    {
      topicId: topics[2].topicId,
      questionText: 'Bộ phận nào của cây thực hiện quang hợp?',
      choices: ['Lá', 'Rễ', 'Thân', 'Hoa'],
      correctIndex: 0,
      status: 'new'
    },
    {
      topicId: topics[3].topicId,
      questionText: 'Ngôn ngữ lập trình phổ biến nhất năm 2024 là gì?',
      choices: ['C++', 'Python', 'Go', 'Rust'],
      correctIndex: 1,
      status: 'new'
    },
    {
      topicId: topics[4].topicId,
      questionText: 'Ai là tác giả của truyện thơ “Truyện Kiều”?',
      choices: ['Huy Cận', 'Xuân Diệu', 'Nguyễn Du', 'Tố Hữu'],
      correctIndex: 2,
      status: 'new'
    },
  ]);
  

  console.log('✅ Seed completed!');
}

seed().catch((e) => {
  console.error('❌ Seed failed:', e);
});
