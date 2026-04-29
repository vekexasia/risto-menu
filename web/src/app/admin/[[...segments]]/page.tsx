import AdminRouter from "./AdminRouter";

export function generateStaticParams() {
  return [{ segments: [] }];
}

export default function AdminPage() {
  return <AdminRouter />;
}
