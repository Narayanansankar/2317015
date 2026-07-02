import { Card, CardContent, Typography, Chip, Stack } from "@mui/material";
import { Notification } from "../types/notification";

interface Props {
  notification: Notification;
  isNew: boolean;
  onClick: () => void;
}

const typeColor: Record<string, "info" | "success" | "warning"> = {
  Placement: "success",
  Result: "warning",
  Event: "info",
};

function NotificationCard({ notification, isNew, onClick }: Props) {
  return (
    <Card
      onClick={onClick}
      variant="outlined"
      sx={{
        mb: 2,
        cursor: "pointer",
        borderLeft: isNew ? "4px solid #1976d2" : "4px solid transparent",
        backgroundColor: isNew ? "#f0f7ff" : "background.paper",
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Chip label={notification.Type} color={typeColor[notification.Type] || "default"} size="small" />
          {isNew && <Chip label="New" color="primary" size="small" />}
        </Stack>
        <Typography variant="body1">{notification.Message}</Typography>
        <Typography variant="caption" color="text.secondary">
          {notification.Timestamp}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default NotificationCard;
