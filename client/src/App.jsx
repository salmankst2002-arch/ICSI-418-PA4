

import { BrowserRouter, Routes, Route } from "react-router-dom";

import Signup from "./components/Signup";
import Login from "./components/Login";
import CreateProject from "./components/CreateProject";
import ViewProjects from "./components/ViewProjects";
import ManageMembers from "./components/ManageMembers";
import ProjectBacklog from "./components/ProjectBacklog";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Existing PA2 functionality */}
        <Route path="/" element={<Signup />} />
        <Route path="/login" element={<Login />} />

        {/* Existing PA3 functionality */}
        <Route
          path="/create-project"
          element={<CreateProject />}
        />

        <Route
          path="/projects"
          element={<ViewProjects />}
        />

        <Route
          path="/projects/:projectId/members"
          element={<ManageMembers />}
        />

        {/* New PA4 functionality */}
        <Route
          path="/backlog"
          element={<ProjectBacklog />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
