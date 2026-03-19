import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/tasks/$taskId')({
  component: TaskResultPage,
});

function TaskResultPage() {
  const { taskId } = Route.useParams();
  return <div>Task Result: {taskId}</div>;
}
