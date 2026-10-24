import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AstPage } from "../features/ast/AstPage";
import { DemoProvider } from "../features/demo/DemoContext";
import { DocsPage } from "../features/docs/DocsPage";
import { EvaluationPage } from "../features/evaluation/EvaluationPage";
import { HypothesesPage } from "../features/hypotheses/HypothesesPage";
import { LearningPage } from "../features/learning/LearningPage";
import { LexerPage } from "../features/lexer/LexerPage";
import { OverviewPage } from "../features/overview/OverviewPage";
import { ParserPage } from "../features/parser/ParserPage";
import { RepairPage } from "../features/repair/RepairPage";
import { WorkbenchPage } from "../features/workbench/WorkbenchPage";
import { AppShell } from "./AppShell";
import { ProjectProvider } from "./ProjectContext";

export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/workbench" element={<WorkbenchPage />} />
        <Route path="/lexer" element={<LexerPage />} />
        <Route path="/parser" element={<ParserPage />} />
        <Route path="/ast" element={<AstPage />} />
        <Route path="/repair" element={<RepairPage />} />
        <Route path="/hypotheses" element={<HypothesesPage />} />
        <Route path="/evaluation" element={<EvaluationPage />} />
        <Route path="/learn" element={<LearningPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/docs/:name" element={<DocsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ProjectProvider>
        <DemoProvider>
          <AppRoutes />
        </DemoProvider>
      </ProjectProvider>
    </BrowserRouter>
  );
}
