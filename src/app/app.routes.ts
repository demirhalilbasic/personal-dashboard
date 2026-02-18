import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Courses } from './pages/courses/courses';
import { Schedule } from './pages/schedule/schedule';
import { Contact } from './pages/contact/contact';
import { Login } from './pages/auth/login/login';
import { Register } from './pages/auth/register/register';
import { Dashboard } from './pages/dashboard/dashboard';
import { Settings } from './pages/settings/settings';
import { FunZoneComponent } from './pages/fun-zone/fun-zone';
import { MyTrackersComponent } from './pages/my-trackers/my-trackers';
import { BingoComponent } from './pages/fun-zone/games/bingo/bingo';
import { QuizComponent } from './pages/fun-zone/games/quiz/quiz';
import { VisionBoardComponent } from './pages/fun-zone/games/vision-board/vision-board';
import { WhiteboardComponent } from './pages/fun-zone/games/whiteboard/whiteboard';
import { KanbanComponent } from './pages/fun-zone/games/kanban/kanban';
import { SnakeComponent } from './pages/fun-zone/games/snake/snake';
import { AiInsightPage } from './pages/ai-insight/ai-insight';
import { authGuard } from './guards/auth.guard';

// Tracker components
import { HabitTrackerComponent } from './pages/my-trackers/trackers/habit-tracker/habit-tracker';
import { SleepTrackerComponent } from './pages/my-trackers/trackers/sleep-tracker/sleep-tracker';
import { StudyPlanner } from './pages/my-trackers/trackers/study-planner/study-planner';
import { FitnessTracker } from './pages/my-trackers/trackers/fitness-tracker/fitness-tracker';
import { TaskPlanner } from './pages/my-trackers/trackers/task-planner/task-planner';
import { MealPlanner } from './pages/my-trackers/trackers/meal-planner/meal-planner';
import { MoodTrackerComponent } from './pages/my-trackers/trackers/mood-tracker/mood-tracker';
import { FinanceTracker } from './pages/my-trackers/trackers/finance-tracker/finance-tracker';
import { GratitudeJournalComponent } from './pages/my-trackers/trackers/gratitude-journal/gratitude-journal';
import { DailyReflection } from './pages/my-trackers/trackers/daily-reflection/daily-reflection';
import { WaterIntakeComponent } from './pages/my-trackers/trackers/water-intake/water-intake';
import { ReadingTracker } from './pages/my-trackers/trackers/reading-tracker/reading-tracker';
import { ScreenTime } from './pages/my-trackers/trackers/screen-time/screen-time';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'kursevi', component: Courses },
  { path: 'raspored', component: Schedule },
  { path: 'kontakt', component: Contact },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'settings', component: Settings, canActivate: [authGuard] },
  { path: 'fun-zone', component: FunZoneComponent, canActivate: [authGuard] },
  { path: 'fun-zone/bingo', component: BingoComponent, canActivate: [authGuard] },
  { path: 'fun-zone/quiz', component: QuizComponent, canActivate: [authGuard] },
  { path: 'fun-zone/vision-board', component: VisionBoardComponent, canActivate: [authGuard] },
  { path: 'fun-zone/whiteboard', component: WhiteboardComponent, canActivate: [authGuard] },
  { path: 'fun-zone/kanban', component: KanbanComponent, canActivate: [authGuard] },
  { path: 'fun-zone/snake', component: SnakeComponent, canActivate: [authGuard] },
  { path: 'my-trackers', component: MyTrackersComponent, canActivate: [authGuard] },
  { path: 'ai-insight', component: AiInsightPage, canActivate: [authGuard] },
  // Tracker routes
  { path: 'my-trackers/habit', component: HabitTrackerComponent, canActivate: [authGuard] },
  { path: 'my-trackers/sleep', component: SleepTrackerComponent, canActivate: [authGuard] },
  { path: 'my-trackers/study', component: StudyPlanner, canActivate: [authGuard] },
  { path: 'my-trackers/fitness', component: FitnessTracker, canActivate: [authGuard] },
  { path: 'my-trackers/task', component: TaskPlanner, canActivate: [authGuard] },
  { path: 'my-trackers/meal', component: MealPlanner, canActivate: [authGuard] },
  { path: 'my-trackers/mood', component: MoodTrackerComponent, canActivate: [authGuard] },
  { path: 'my-trackers/finance', component: FinanceTracker, canActivate: [authGuard] },
  { path: 'my-trackers/gratitude', component: GratitudeJournalComponent, canActivate: [authGuard] },
  { path: 'my-trackers/reflection', component: DailyReflection, canActivate: [authGuard] },
  { path: 'my-trackers/water', component: WaterIntakeComponent, canActivate: [authGuard] },
  { path: 'my-trackers/reading', component: ReadingTracker, canActivate: [authGuard] },
  { path: 'my-trackers/screentime', component: ScreenTime, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
