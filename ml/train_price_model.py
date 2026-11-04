"""Train the daily rental price model and export its coefficients for the Node.js backend.

Usage: python train_price_model.py cars.csv
CSV columns: brand, fuel, transmission, city, year, seats, daily_price
"""
import json
import sys

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

CATEGORICAL = ["brand", "fuel", "transmission", "city"]
NUMERIC = ["year", "seats"]

df = pd.read_csv(sys.argv[1])
for col in CATEGORICAL:
    df[col] = df[col].str.lower().str.strip()

X, y = df[CATEGORICAL + NUMERIC], df["daily_price"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

pipe = Pipeline([
    ("prep", ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL),
        ("num", "passthrough", NUMERIC),
    ])),
    ("model", LinearRegression()),
])
pipe.fit(X_train, y_train)

pred = pipe.predict(X_test)
print(f"MSE: {mean_squared_error(y_test, pred):.2f}")
print(f"R2:  {r2_score(y_test, pred):.3f}")

encoder = pipe.named_steps["prep"].named_transformers_["cat"]
coefs = list(pipe.named_steps["model"].coef_)
model = {"intercept": float(pipe.named_steps["model"].intercept_), "minPrice": 80, "numeric": {}, "categorical": {}}
i = 0
for col, cats in zip(CATEGORICAL, encoder.categories_):
    model["categorical"][col] = {}
    for cat in cats:
        model["categorical"][col][cat] = float(coefs[i])
        i += 1
for col in NUMERIC:
    model["numeric"][col] = float(coefs[i])
    i += 1

with open("price_model.json", "w") as f:
    json.dump(model, f, indent=2)
print("Saved price_model.json")
