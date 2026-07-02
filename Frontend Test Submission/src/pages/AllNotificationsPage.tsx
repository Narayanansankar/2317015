import { useEffect, useState } from "react";
import { Container, Typography, Pagination, Stack, CircularProgress, Alert } from "@mui/material";
import { Log } from "logging-middleware";
import { fetchNotifications } from "../services/notificationApi";
import { Notification } from "../types/notification";
import { useViewedNotifications } from "../hooks/useViewedNotifications";
import NotificationList from "../components/NotificationList";

const PAGE_SIZE = 10;

function AllNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { isViewed, markAsViewed } = useViewedNotifications();

  useEffect(() => {
    Log("frontend", "info", "page", "loading all notifications page");
    setLoading(true);
    setError("");
    fetchNotifications({ limit: PAGE_SIZE, page })
      .then(setNotifications)
      .catch(() => setError("Could not load notifications. Please try again."))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        All Notifications
      </Typography>

      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        <>
          <NotificationList notifications={notifications} isViewed={isViewed} onView={markAsViewed} />
          <Stack alignItems="center" sx={{ mt: 3 }}>
            <Pagination count={5} page={page} onChange={(_, value) => setPage(value)} color="primary" />
          </Stack>
        </>
      )}
    </Container>
  );
}

export default AllNotificationsPage;
