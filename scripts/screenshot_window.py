import Quartz
import sys
import subprocess

def get_window_id(app_name):
    window_list = Quartz.CGWindowListCopyWindowInfo(Quartz.kCGWindowListOptionOnScreenOnly | Quartz.kCGWindowListExcludeDesktopElements, Quartz.kCGNullWindowID)
    for win in window_list:
        name = win.get(Quartz.kCGWindowOwnerName, '')
        if name == app_name:
            return win.get(Quartz.kCGWindowNumber)
    return None

def capture(app_name, out_path):
    wid = get_window_id(app_name)
    if wid:
        subprocess.run(['screencapture', '-l', str(wid), out_path])
        print(f"Captured {app_name} to {out_path}")
    else:
        print(f"Window for {app_name} not found!")

if __name__ == '__main__':
    capture(sys.argv[1], sys.argv[2])
