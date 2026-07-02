import { Stack, Typography } from "@mui/material";
import { Notification } from "../types/notification";
import NotificationCard from "./NotificationCard";

interface Props {
  notifications: Notification[];
  isViewed: (id: string) => boolean;
  onView: (id: string) => void;
}

function NotificationList({ notifications, isViewed, onView }: Props) {
  if (notifications.length === 0) {
    return <Typography color="text.secondary">No notifications to show.</Typography>;
  }

  return (
    <Stack>
      {notifications.map((n) => (
        <NotificationCard
          key={n.ID}
          notification={n}
          isNew={!isViewed(n.ID)}
          onClick={() => onView(n.ID)}
        />
      ))}
    </Stack>
  );
}

export default NotificationList;
