import sys
from loguru import logger

def setup_logger(log_level: str = "INFO"):
    logger.remove()
    logger.add(
        sys.stderr,
        format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan> - <level>{message}</level>",
        level=log_level,
        colorize=True,
    )
    logger.add(
        "logs/nexus.log",
        rotation="10 MB",
        retention="7 days",
        level="DEBUG",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name} | {message}",
    )
    return logger
