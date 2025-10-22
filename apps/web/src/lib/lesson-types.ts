export type LessonSlideType =
  | 'concept_introduction'
  | 'worked_example'
  | 'scaffolded_problem'
  | 'misconception'
  | 'synthesis';

export interface LessonSlideAssessment {
  type: 'choice' | 'reflection' | 'open';
  prompt: string;
  options?: string[];
  answerIndex?: number;
  explanation?: string;
  correctFeedback?: string;
  incorrectFeedback?: string;
}

export interface LessonSlide {
  slideType: LessonSlideType;
  title: string;
  bodyMd: string;
  assessment?: LessonSlideAssessment;
}
