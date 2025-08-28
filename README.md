# Start a new continous scraping task:

```
POST /api/bot?password=your_secret_password_here
Content-Type: application/json

{
  "taskId": "shop-links",
  "url": "https://newshop.gw-int.pl/login",
  "interval": 3600000  // Run every hour (in milliseconds)
}
```

# Stop a task:

```
DELETE /api/bot?password=your_secret_password_here&taskId=shop-links
```

# Check running tasks:

```
GET /api/bot?password=your_secret_password_here
```
