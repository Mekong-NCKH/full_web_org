import pandas as pd
import time

# ===== CONFIG =====
input_file = "converted_long_format.csv"
coords_file = "cong_locations.csv"
interval = 5  # giây

# ===== LOAD DATA =====
df = pd.read_csv(input_file)
coords = pd.read_csv(coords_file)

# ===== FIX TIME =====
df["time"] = pd.to_datetime(df["time"])

# ===== CLEAN NAME =====
df["name"] = df["name"].astype(str).str.strip().str.replace("_x","").str.replace("_y","")
coords["name"] = coords["name"].astype(str).str.strip()

# ===== MERGE TỌA ĐỘ =====
df = df.merge(coords, on="name", how="left")

# ===== DROP CỐNG KHÔNG CÓ TỌA ĐỘ =====
df = df.dropna(subset=["lat","lon"])

# ===== TẠO MONTH CHUẨN (KHÔNG BAO GIỜ BOOL) =====
df["month"] = df["time"].dt.month.astype(int)

# ===== LOGIC STATUS =====
def get_status(name, month, salinity):
    s = salinity
    m = month
    n = name

    if n == 'Xuan Hoa':
        if m in [12,1,2] and s <= 2:
            return 'Lay nuoc'
        elif m in [3,4]:
            return 'Dong ngan man'
        else:
            return 'Lay nuoc'

    elif n == 'Vam Giong':
        if m == 12 and s < 2:
            return 'Lay nuoc'
        elif m in [1,2,3,4,5]:
            return 'Dong ngan man'
        elif m == 6 and s < 2:
            return 'Lay nuoc'
        else:
            return 'Lay nuoc'

    elif n in ['Rach Bun','Vam Kenh']:
        if s > 1.5:
            return 'Dong tru'

    elif n == 'Go Cong':
        if m in [1,2,3,4]:
            return 'Dong ngan man'
        elif m in [6,7,8,9,10,11]:
            return 'Tru nuoc'

    elif n in ['Go Cat','Bao Dinh']:
        return 'Mo tu do'

    return 'Theo doi'


# ===== STREAM REALTIME =====
times = sorted(df["time"].unique())

print("🚀 Start streaming...")

for t in times:
    df_t = df[df["time"] == t].copy()

    # đảm bảo month luôn đúng
    current_month = int(pd.to_datetime(t).month)
    df_t["month"] = current_month

    # tính status
    df_t["status"] = df_t.apply(
        lambda row: get_status(row["name"], row["month"], row["salinity"]),
        axis=1
    )

    # ===== OUTPUT =====
    output = df_t[["time","name","lat","lon","salinity","month","status"]]

    output.to_csv("data.csv", index=False)

    print(f"⏱ Update: {t} | {len(output)} điểm")

    time.sleep(interval)