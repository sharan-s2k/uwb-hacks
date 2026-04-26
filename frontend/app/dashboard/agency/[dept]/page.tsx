import KanbanBoard from "@/components/KanbanBoard";

interface Props {
  params: { dept: string };
}

export default function DeptKanbanPage({ params }: Props) {
  const agencyName = decodeURIComponent(params.dept);
  return <KanbanBoard agencyName={agencyName} />;
}
