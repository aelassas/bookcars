[0;1;32m●[0m lsyncd.service - Live Syncing (Mirror) Daemon
     Loaded: loaded (/etc/systemd/system/lsyncd.service; enabled; vendor preset: enabled)
     Active: [0;1;32mactive (running)[0m since Thu 2022-05-12 07:52:36 +01; 5s ago
   Main PID: 7964 (lsyncd)
      Tasks: 1 (limit: 65000)
     Memory: 13.7M
     CGroup: /system.slice/lsyncd.service
             └─7964 /usr/bin/lsyncd -nodaemon -pidfile /run/lsyncd.pid /etc/lsyncd/lsyncd.conf.lua

mai 12 07:52:36 poweredge-840 systemd[1]: Started Live Syncing (Mirror) Daemon.
mai 12 07:52:36 poweredge-840 lsyncd[7964]: 07:52:36 Normal: --- Startup ---
mai 12 07:52:36 poweredge-840 lsyncd[7964]: 07:52:36 Normal: recursive startup rsync: /opt/bookcars/ -> /mnt/sdb/bookcars/
mai 12 07:52:36 poweredge-840 lsyncd[7964]: 07:52:36 Normal: recursive startup rsync: /home/aelassas/bookcars/ -> /mnt/sdb/__bookcars__/
mai 12 07:52:36 poweredge-840 lsyncd[7964]: 07:52:36 Normal: recursive startup rsync: /opt/wexstream/ -> /mnt/sdb/wexstream/
mai 12 07:52:36 poweredge-840 lsyncd[7964]: 07:52:36 Normal: recursive startup rsync: /home/aelassas/wexstream/ -> /mnt/sdb/__wexstream__/
mai 12 07:52:37 poweredge-840 lsyncd[7964]: 07:52:37 Normal: Startup of /home/aelassas/bookcars/ -> /mnt/sdb/__bookcars__/ finished.
mai 12 07:52:37 poweredge-840 lsyncd[7964]: 07:52:37 Normal: Startup of /home/aelassas/wexstream/ -> /mnt/sdb/__wexstream__/ finished.
mai 12 07:52:38 poweredge-840 lsyncd[7964]: 07:52:38 Normal: Startup of /opt/wexstream/ -> /mnt/sdb/wexstream/ finished.
mai 12 07:52:39 poweredge-840 lsyncd[7964]: 07:52:39 Normal: Startup of /opt/bookcars/ -> /mnt/sdb/bookcars/ finished.
