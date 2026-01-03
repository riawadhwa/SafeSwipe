# =========================
# FINAL MODEL FEATURE LIST
# =========================
import pandas as pd
import numpy as np

MODEL_FEATURES = [
    "category",
    "amt",
    "city_pop",
    "trans_month",
    "trans_hour",
    "is_weekend",
    "is_night",
    "is_business_hours",
    "is_holiday_season",
    "is_tax_season",
    "hour_sin",
    "hour_cos",
    "month_sin",
    "month_cos",
    "age",
    "age_group",
    "gender_encoded",
    "city_pop_category",
    "is_distant_transaction"
]


def build_model_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Converts raw transaction-level data into model-ready features.
    This function MUST be used during both training and inference.
    """

    df = df.copy()

    # -------- Currency normalization (INR -> USD) --------
    INR_TO_USD = 1 / 83.0
    df["amt"] = df["amt"] * INR_TO_USD


    # -------- Temporal features --------
    df["trans_date_trans_time"] = pd.to_datetime(df["trans_date_trans_time"])
    df["dob"] = pd.to_datetime(df["dob"])

    df["trans_month"] = df["trans_date_trans_time"].dt.month
    df["trans_hour"] = df["trans_date_trans_time"].dt.hour
    df["trans_weekday"] = df["trans_date_trans_time"].dt.weekday

    df["is_weekend"] = (df["trans_weekday"] >= 5).astype(int)
    df["is_night"] = df["trans_hour"].isin([22, 23, 0, 1, 2, 3, 4, 5]).astype(int)
    df["is_business_hours"] = (
        (df["trans_hour"] >= 9) & (df["trans_hour"] <= 17) & (df["trans_weekday"] < 5)
    ).astype(int)

    df["is_holiday_season"] = df["trans_month"].isin([11, 12]).astype(int)
    df["is_tax_season"] = df["trans_month"].isin([1, 2, 3, 4]).astype(int)

    df["hour_sin"] = np.sin(2 * np.pi * df["trans_hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["trans_hour"] / 24)
    df["month_sin"] = np.sin(2 * np.pi * df["trans_month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["trans_month"] / 12)

    # -------- Demographics --------
    ref_date = pd.to_datetime("2021-01-01")
    df["age"] = (ref_date - df["dob"]).dt.days // 365

    df["age_group"] = pd.cut(
        df["age"],
        bins=[0, 18, 25, 35, 50, 65, 100],
        labels=[0, 1, 2, 3, 4, 5]  # numeric for ML
    )
    df["age_group"] = df["age_group"].astype(int)



    df["gender_encoded"] = df["gender"].map({"M": 1, "F": 0})

    # -------- Geographic --------
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371
        dlat = np.radians(lat2 - lat1)
        dlon = np.radians(lon2 - lon1)
        a = (
            np.sin(dlat / 2) ** 2
            + np.cos(np.radians(lat1))
            * np.cos(np.radians(lat2))
            * np.sin(dlon / 2) ** 2
        )
        return 2 * R * np.arcsin(np.sqrt(a))

    df["distance_km"] = haversine(
        df["lat"], df["long"], df["merch_lat"], df["merch_long"]
    )
    df["is_distant_transaction"] = (df["distance_km"] > 100).astype(int)

    df["city_pop_category"] = pd.cut(
        df["city_pop"],
        bins=[0, 10000, 50000, 100000, 500000, 1000000, np.inf],
        labels=[0, 1, 2, 3, 4, 5]
    )
    df["city_pop_category"] = df["city_pop_category"].astype(int)
    
    df["category"] = df["category"].astype("category").cat.codes

    # -------- Final selection --------
    return df[MODEL_FEATURES]
