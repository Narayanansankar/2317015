import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import { Link } from "react-router-dom";

function Navbar() {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Notifications
        </Typography>
        <Button color="inherit" component={Link} to="/">
          All Notifications
        </Button>
        <Button color="inherit" component={Link} to="/priority">
          Priority Inbox
        </Button>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
