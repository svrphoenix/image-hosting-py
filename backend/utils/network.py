import socket

def get_server_info() -> tuple[str, str]:
    """
    Отримує реальне ім'я хоста (Container ID в Docker)
    та його внутрішню IP-адресу в мережі.
    """
    try:
        hostname = socket.gethostname()

        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip_address = s.getsockname()[0]
        s.close()
    except Exception:
        hostname = socket.gethostname()
        try:
            ip_address = socket.gethostbyname(hostname)
        except Exception:
            ip_address = "unknown"

    return hostname, ip_address