import React from 'react';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Box, IconButton, useTheme, useMediaQuery, Divider } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import GroupIcon from '@mui/icons-material/Group';
import StoreIcon from '@mui/icons-material/Store';
import AnalyticsIcon from '@mui/icons-material/BarChart';
import TaskIcon from '@mui/icons-material/Task';
import MenuBookIcon from '@mui/icons-material/MenuBook';

const drawerWidth = 240;

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <HomeIcon /> },
  { id: 'pos', label: 'POS System', icon: <ShoppingCartIcon /> },
  { id: 'menu', label: 'Menu', icon: <MenuBookIcon /> },
  { id: 'inventory', label: 'Inventory', icon: <AssignmentIcon /> },
  { id: 'billing', label: 'Invoices', icon: <CurrencyRupeeIcon /> },
  { id: 'staff', label: 'Staff & Payroll', icon: <GroupIcon /> },
  { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
  { id: 'tasks', label: 'Tasks & Ops', icon: <TaskIcon /> },
];

export function Sidebar({ activeModule, onModuleChange }: { activeModule: string, onModuleChange: (id: string) => void }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const drawer = (
    <div>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
        <StoreIcon color="primary" sx={{ mr: 1 }} />
        <Box>
          <Typography
            variant="h6"
            fontWeight={700}
            className="bg-gradient-to-r from-blue-600 to-purple-500 bg-clip-text text-transparent"
            style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            ServeIT
          </Typography>
          <Typography variant="caption" color="textSecondary">Restaurant Management</Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map(item => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              selected={activeModule === item.id}
              onClick={() => {
                onModuleChange(item.id);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                color: activeModule === item.id ? 'primary.main' : 'text.primary',
                bgcolor: activeModule === item.id ? 'primary.lighter' : 'inherit',
                borderRadius: 2,
                my: 0.5,
              }}
            >
              <ListItemIcon sx={{ color: activeModule === item.id ? 'primary.main' : 'text.secondary' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <>
      {isMobile && (
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={() => setMobileOpen(true)}
          sx={{ position: 'fixed', top: 16, left: 16, zIndex: 1300 }}
        >
          <MenuIcon />
        </IconButton>
      )}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="sidebar navigation"
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
    </>
  );
}