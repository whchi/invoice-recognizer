import { TemplateList } from '@frontend/components/templates/template-list';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/templates/')({
  component: TemplateList,
});
