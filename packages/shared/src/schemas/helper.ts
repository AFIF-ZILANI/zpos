import { z } from "zod";

export const decimalNumber = z.preprocess(
    (val) => {
        if (typeof val === "string") {
            const parsed = Number(val);
            return Number.isFinite(parsed) ? parsed : undefined;
        }
        return val;
    },
    z
        .number({ error: "Value is required" })
        .positive("Must be greater than 0")
        .refine(
            (v) => Number(v.toFixed(2)) === v,
            "Maximum 2 decimal places allowed"
        )
);

export const decimalOptional = z
    .preprocess(
        (val) => {
            if (val === "" || val === undefined || val === null)
                return undefined;

            if (typeof val === "string") {
                const parsed = Number(val);
                return Number.isFinite(parsed) ? parsed : undefined;
            }

            return val;
        },
        z
            .number()
            .refine(
                (v) => Number(v.toFixed(2)) === v,
                "Maximum 2 decimal places allowed"
            )
    )
    .optional();

export const decimalOptionalZero = z
    .preprocess((val) => {
        if (val === "" || val === undefined || val === null) {
            return 0;
        }

        if (typeof val === "string") {
            const parsed = Number(val);
            return Number.isFinite(parsed) ? parsed : 0;
        }

        if (typeof val === "number") {
            return val;
        }

        return 0;
    },
        z.number().refine(
            (v) => Number(v.toFixed(2)) === v,
            "Maximum 2 decimal places allowed"
        ));

export const zodUUID = z.string().uuid("Invalid UUID");
export const zodUUIDArray = z.array(zodUUID);
export const zodUUIDOptional = z.string().uuid().optional();
export const zodDate = z.coerce.date();

export const uuidOptional = z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().uuid().optional()
);

export const bangladeshiPhoneSchema = z.string().regex(
    /^(?:\+8801|8801|01)[3-9]\d{8}$/,
    "Invalid Bangladeshi phone number"
);