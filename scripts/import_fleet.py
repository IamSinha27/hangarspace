#!/usr/bin/env python3
"""
Import aircraft fleet from an Excel or CSV file into Hangarspace.

Usage:
    python import_fleet.py fleet.xlsx --api http://localhost:8000 --email you@fbo.com --password yourpass
    python import_fleet.py fleet.csv  --api http://localhost:8000 --email you@fbo.com --password yourpass

Expected columns (all dimensions in feet):
    name, length_ft, wingspan_ft, tail_height_ft, fuselage_width_ft,
    wing_root_height_ft, wing_thickness_ft, wing_type, elevator_span_ft

wing_type must be one of: low, mid, high
elevator_span_ft is optional (defaults to 0).
"""

import argparse
import sys
import requests
import pandas as pd

FT_TO_M = 0.3048
WING_TYPES = {"low", "mid", "high"}
WING_TYPE_ALIASES = {"rotor": "low"}

REQUIRED_COLS = [
    "name", "length_ft", "wingspan_ft", "tail_height_ft",
    "fuselage_width_ft", "wing_root_height_ft", "wing_thickness_ft", "wing_type",
]


def load_file(path):
    if path.endswith(".csv"):
        return pd.read_csv(path)
    return pd.read_excel(path)


COLUMN_ALIASES = {
    'aircraft':              'name',
    'length (ft)':           'length_ft',
    'wingspan (ft)':         'wingspan_ft',
    'tail height (ft)':      'tail_height_ft',
    'fuselage width (ft)':   'fuselage_width_ft',
    'wing root height (ft)': 'wing_root_height_ft',
    'wing thickness (ft)':   'wing_thickness_ft',
    'wing type':             'wing_type',
    'elevator span (ft)':    'elevator_span_ft',
}

def validate_and_convert(df):
    df.columns = [c.strip().lower() for c in df.columns]
    df.rename(columns=COLUMN_ALIASES, inplace=True)

    missing = [c for c in REQUIRED_COLS if c not in df.columns]
    if missing:
        print(f"ERROR: Missing columns: {', '.join(missing)}")
        print(f"Expected: {', '.join(REQUIRED_COLS)}")
        sys.exit(1)

    records = []
    errors = []

    for i, row in df.iterrows():
        row_num = i + 2  # 1-indexed + header row
        err = []

        name = str(row["name"]).strip() if pd.notna(row["name"]) else ""
        if not name:
            err.append("name is empty")

        wing_type = str(row["wing_type"]).strip().lower() if pd.notna(row["wing_type"]) else ""
        wing_type = WING_TYPE_ALIASES.get(wing_type, wing_type)
        if wing_type not in WING_TYPES:
            err.append(f"wing_type '{wing_type}' invalid — must be low, mid, or high")

        def get_float(col, optional=False):
            val = row.get(col)
            if pd.isna(val):
                if optional:
                    return 0.0
                err.append(f"{col} is missing")
                return None
            try:
                f = float(val)
                if f < 0:
                    err.append(f"{col} cannot be negative (got {f})")
                return f
            except (ValueError, TypeError):
                err.append(f"{col} must be a number (got '{val}')")
                return None

        length           = get_float("length_ft")
        wingspan         = get_float("wingspan_ft")
        tail_height      = get_float("tail_height_ft")
        fuselage_width   = get_float("fuselage_width_ft")
        wing_root_height = get_float("wing_root_height_ft")
        wing_thickness   = get_float("wing_thickness_ft")
        elevator_span    = get_float("elevator_span_ft", optional=True)

        if err:
            errors.append((row_num, name or "(unnamed)", err))
            continue

        records.append({
            "name":               name,
            "length_m":           round(length * FT_TO_M, 4),
            "wingspan_m":         round(wingspan * FT_TO_M, 4),
            "tail_height_m":      round(tail_height * FT_TO_M, 4),
            "fuselage_width_m":   round(fuselage_width * FT_TO_M, 4),
            "wing_root_height_m": round(wing_root_height * FT_TO_M, 4),
            "wing_thickness_m":   round(wing_thickness * FT_TO_M, 4),
            "wing_type":          wing_type,
            "elevator_span_m":    round(elevator_span * FT_TO_M, 4),
        })

    if errors:
        print(f"\n{len(errors)} row(s) failed validation:\n")
        for row_num, name, errs in errors:
            print(f"  Row {row_num} ({name}):")
            for e in errs:
                print(f"    - {e}")
        print()

    return records, errors


def login(api_url, email, password):
    res = requests.post(f"{api_url}/auth/login", json={"email": email, "password": password})
    if res.status_code != 200:
        print(f"ERROR: Login failed — {res.json().get('detail', res.text)}")
        sys.exit(1)
    return res.json()["access_token"]


def import_records(api_url, token, records):
    headers = {"Authorization": f"Bearer {token}"}
    added, failed = [], []

    for rec in records:
        res = requests.post(f"{api_url}/fleet", json=rec, headers=headers)
        if res.status_code == 201:
            added.append(rec["name"])
            print(f"  + {rec['name']}")
        else:
            failed.append((rec["name"], res.status_code, res.text))
            print(f"  x {rec['name']} — {res.status_code}: {res.text}")

    return added, failed


def main():
    parser = argparse.ArgumentParser(description="Import fleet from Excel/CSV into Hangarspace")
    parser.add_argument("file",       help="Path to .xlsx or .csv file")
    parser.add_argument("--api",      required=True, help="API base URL, e.g. http://localhost:8000")
    parser.add_argument("--email",    required=True, help="Your Hangarspace login email")
    parser.add_argument("--password", required=True, help="Your Hangarspace password")
    parser.add_argument("--yes", "-y", action="store_true", help="Skip confirmation prompt")
    args = parser.parse_args()

    print(f"\nLoading {args.file}...")
    df = load_file(args.file)
    print(f"Found {len(df)} row(s)\n")

    print("Validating...")
    records, errors = validate_and_convert(df)
    print(f"{len(records)} valid, {len(errors)} invalid\n")

    if not records:
        print("Nothing to import.")
        sys.exit(1 if errors else 0)

    if errors:
        if not args.yes:
            answer = input(f"Proceed with the {len(records)} valid record(s)? [y/N] ").strip().lower()
            if answer != "y":
                print("Aborted.")
                sys.exit(0)

    print(f"\nLogging in as {args.email}...")
    token = login(args.api.rstrip("/"), args.email, args.password)
    print("Logged in.\n")

    print("Importing:")
    added, failed = import_records(args.api.rstrip("/"), token, records)

    print(f"\nDone — {len(added)} added, {len(failed)} failed.")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
