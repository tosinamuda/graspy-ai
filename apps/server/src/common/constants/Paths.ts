
export default {
  Base: '/api',
  Users: {
    Base: '/users',
    Get: '/all',
    Add: '/add',
    Update: '/update',
    Delete: '/delete/:id',
  },
  Curriculum: {
    Base: '/curriculum',
    Generate: '/generate',
    GenerateStream: '/generate-stream',
    GenerateLesson: '/lesson',
  },
} as const;
