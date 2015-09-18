DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` varchar(32) NOT NULL,
  `nickname` varchar(64) NOT NULL,
  `score` int(10) NOT NULL DEFAULT '0',
  `ban` int(1) NOT NULL DEFAULT '0',
  `last_active` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `games`;
CREATE TABLE `games` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `userId` varchar(32) NOT NULL,
  `traveled` int(10) DEFAULT '0',
  `traveledTime` int(10) DEFAULT '0',
  `score` int(10) DEFAULT '0',
  `finished` int(1) DEFAULT '0',
  `lives` int(1) DEFAULT '0',
  `date` datetime,
  `agent_isMobile` int(1),
  `agent_isDesktop` int(1),
  `agent_browser` varchar(64),
  `agent_version` varchar(32),
  `agent_os` varchar(64),
  `agent_platform` varchar(64),
  `agent_ip` varchar(24),
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY(`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


DROP TABLE IF EXISTS `game_tracks`;
CREATE TABLE `game_tracks` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `gameId` int(10) NOT NULL,
  `traveled` int(10) DEFAULT '0',
  `traveledTime` int(10) DEFAULT '0',
  `score` int(10) DEFAULT '0',
  `obst1` int(10) DEFAULT '0',
  `obst2` int(10) DEFAULT '0',
  `obst3` int(10) DEFAULT '0',
  `obst4` int(10) DEFAULT '0',
  `obst5` int(10) DEFAULT '0',
  `obst6` int(10) DEFAULT '0',
  `reason` char(16) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY(`gameId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
