import { Router } from 'express';
import type { Container } from '../../container/container';
import { createAuthRouter } from '../../modules/auth/auth.routes';
import { createStudentRouter } from '../../modules/student/student.routes';
import { createCurriculumRouter } from '../../modules/curriculum/curriculum.routes';
import { createDiagnosticRouter } from '../../modules/diagnostic/diagnostic.routes';
import { createPracticeRouter } from '../../modules/practice/practice.routes';
import { createTeacherRouter } from '../../modules/teacher/teacher.routes';
import { createParentRouter } from '../../modules/parent/parent.routes';
import { createAnalyticsRouter } from '../../modules/analytics/analytics.routes';

/** Composes all module routers under /api/v1. */
export function createV1Router(container: Container): Router {
  const router = Router();

  router.use('/auth', createAuthRouter(container.authService));
  router.use(
    '/students',
    createStudentRouter(container.studentService, container.masteryService),
  );
  router.use(
    '/curriculum',
    createCurriculumRouter(container.topicService, container.questionService),
  );
  router.use(
    '/diagnostic',
    createDiagnosticRouter(container.diagnosticService, container.studentService),
  );
  router.use(
    '/practice',
    createPracticeRouter(container.practiceService, container.studentService),
  );
  router.use('/teacher', createTeacherRouter(container.teacherService));
  router.use('/parent', createParentRouter(container.parentService));
  router.use('/analytics', createAnalyticsRouter(container.analyticsService));

  return router;
}
