import { useEffect, useState } from "react";
import {
  Container,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Stack,
  SelectChangeEvent,
} from "@mui/material";
import { Log } from "logging-middleware";
import { fetchNotifications } from "../services/notificationApi";
import { Notification } from "../types/notification";
import { useViewedNotifications } from "../hooks/useViewedNotifications";
import NotificationList from "../components/NotificationList";

// same weight idea as Stage 6 - placement matters most, then result, then event
const TYPE_WEIGHT: Record<string, number> = { Placement: 3, Result: 2, Event: 1 };

function getScore(n: Notification) {
  const weight = TYPE_WEIGHT[n.Type] || 0;
  const time = new Date(n.Timestamp).getTime();
  return weight * 1_000_000_000_000 + time;
}

function PriorityNotificationsPage() {
  const [all, setAll] = useState<Notification[]>([]);
  const [topN, setTopN] = useState(10);
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { isViewed, markAsViewed } = useViewedNotifications();

  useEffect(() => {
    Log("frontend", "info", "page", "loading priority notifications page");
    setLoading(true);
    setError("");
    fetchNotifications({
      limit: 100,
      notification_type: typeFilter !== "all" ? typeFilter : undefined,
    })
      .then(setAll)
      .catch(() => setError("Could not load notifications. Please try again."))
      .finally(() => setLoading(false));
  }, [typeFilter]);

  const top = [...all].sort((a, b) => getScore(b) - getScore(a)).slice(0, topN);

  function handleTopNChange(e: SelectChangeEvent<number>) {
    setTopN(Number(e.target.value));
  }

  function handleTypeChange(e: SelectChangeEvent) {
    setTypeFilter(e.target.value);
  }

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Priority Inbox
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Top</InputLabel>
          <Select value={topN} label="Top" onChange={handleTopNChange}>
            <MenuItem value={10}>Top 10</MenuItem>
            <MenuItem value={15}>Top 15</MenuItem>
            <MenuItem value={20}>Top 20</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Type</InputLabel>
          <Select value={typeFilter} label="Type" onChange={handleTypeChange}>
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="Placement">Placement</MenuItem>
            <MenuItem value="Result">Result</MenuItem>
            <MenuItem value="Event">Event</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        <NotificationList notifications={top} isViewed={isViewed} onView={markAsViewed} />
      )}
    </Container>
  );
}

export default PriorityNotificationsPage;
