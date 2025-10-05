import { Router } from 'express';

import Paths from '@src/common/constants/Paths';
import UserRoutes from './UserRoutes';
import CurriculumRoutes from './CurriculumRoutes';


/******************************************************************************
                                Setup
******************************************************************************/

const apiRouter = Router();


// ** Add UserRouter ** //

// Init router
const userRouter = Router();

// Get all users
userRouter.get(Paths.Users.Get, UserRoutes.getAll);
userRouter.post(Paths.Users.Add, UserRoutes.add);
userRouter.put(Paths.Users.Update, UserRoutes.update);
userRouter.delete(Paths.Users.Delete, UserRoutes.delete);

// Add UserRouter
apiRouter.use(Paths.Users.Base, userRouter);


// ** Add CurriculumRouter ** //

const curriculumRouter = Router();

// Generate curriculum
curriculumRouter.post(Paths.Curriculum.Generate, CurriculumRoutes.generate);
curriculumRouter.get(
  Paths.Curriculum.GenerateStream,
  CurriculumRoutes.generateStream,
);
curriculumRouter.get(
  Paths.Curriculum.GenerateLesson,
  CurriculumRoutes.getLessonSession,
);
curriculumRouter.post(
  Paths.Curriculum.GenerateLesson,
  CurriculumRoutes.generateLessonSession,
);

// Add CurriculumRouter
apiRouter.use(Paths.Curriculum.Base, curriculumRouter);


/******************************************************************************
                                Export default
******************************************************************************/

export default apiRouter;
