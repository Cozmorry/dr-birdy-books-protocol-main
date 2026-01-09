# AWS IAM Permission Fix Guide

## Important: Policy Types

This guide is for fixing **IAM identity-based policies** (policies attached to IAM users, groups, or roles). These policies:
- ✅ **Do NOT** require a `Principal` element
- ✅ Are created in IAM → Policies → Create policy
- ✅ Are attached to users/roles/groups

**Resource-based policies** (like S3 bucket policies) are different and DO require a `Principal` element, but that's not what we're working with here.

## Problem

You're getting this error:
```
User: arn:aws:iam::378173487837:user/Contract_Developer is not authorized to perform: s3:GetObject on resource: "arn:aws:s3:::dr-birdy-books-files/files/..." with an explicit deny in an identity-based policy
```

**Key Issue**: The error mentions "explicit deny in an identity-based policy". This means there's a Deny statement in one of the IAM policies attached to your user that's blocking the `s3:GetObject` action.

## Why Explicit Deny Blocks Everything

In AWS IAM:
- **Allow** statements grant permissions
- **Deny** statements block permissions (even if an Allow exists)
- **Explicit Deny always wins** - it overrides any Allow statements

So even if your user has `s3:GetObject` in an Allow statement, an explicit Deny will block it.

## How to Fix

### Step 1: Find the Problematic Policy

1. Log in to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **IAM** service
3. Click **Users** in the left sidebar
4. Find and click on **Contract_Developer**
5. Go to the **Permissions** tab
6. Look at all policies attached to this user:
   - **Permissions policies** (inline and managed)
   - **Permissions boundaries**
   - Check if user is in any **Groups** with policies attached

### Step 2: Identify the Deny Statement

Look for any policy that contains:
```json
{
  "Effect": "Deny",
  "Action": [
    "s3:*",
    "s3:GetObject",
    "s3:Get*"
  ],
  "Resource": [
    "arn:aws:s3:::dr-birdy-books-files",
    "arn:aws:s3:::dr-birdy-books-files/*"
  ]
}
```

**Note**: This example shows common Deny patterns - `s3:*` denies all S3 actions, `s3:GetObject` specifically denies GetObject, and `s3:Get*` denies all Get actions.

Common places where this might appear:
- **Inline policies** attached directly to the user
- **Managed policies** attached to the user (like custom policies you created)
- **Group policies** if the user is in a group

### Step 3: Remove or Fix the Deny Statement

**Found a "compromised key quarantine" policy?** This is likely a policy created to block access due to a compromised key detection. You have a few options:

1. **Edit it to allow your bucket** (if you've rotated the keys and want to keep the quarantine for other resources)
2. **Detach it from the user** (if the key is no longer compromised)
3. **Remove the Deny statement entirely** (if you want to disable the quarantine)

You have several options:

#### Option A: Remove the Deny Statement (Recommended)

**For "compromised key quarantine" policies:**

If the Deny statement is in an **inline policy**:
1. In IAM → Users → Contract_Developer → Permissions tab
2. Find the "compromised key quarantinev3" policy
3. Click on the policy name (or click the expand arrow to see details)
4. Click **Edit** button
5. Go to the **JSON** tab
6. Remove or modify the Deny statement that's blocking `s3:GetObject`
7. Click **Save changes**

If the Deny statement is in a **managed policy** (like "compromised key quarantinev3"):
1. Go to **IAM → Policies** in the left sidebar
2. Search for "compromised key quarantinev3" 
3. Click on the policy name
4. Click the **Edit** button (top right)
5. Select the **JSON** tab
6. Find the Deny statement and either:
   - **Remove it entirely** (if you've rotated keys and no longer need quarantine)
   - **Modify it** to exclude your bucket using `NotResource`:
     ```json
     {
       "Effect": "Deny",
       "Action": "s3:*",
       "NotResource": [
         "arn:aws:s3:::dr-birdy-books-files",
         "arn:aws:s3:::dr-birdy-books-files/*"
       ]
     }
     ```
7. Click **Next** → **Save changes**

**Alternative: Detach the policy** (if you've rotated the compromised keys):
1. Go to IAM → Users → Contract_Developer → Permissions tab
2. Find "compromised key quarantinev3"
3. Check the box next to it
4. Click **Remove** button
5. Confirm removal

**Note**: If it's an **AWS-managed policy**, you cannot edit it - you must detach it from the user instead.

#### Option B: Create a New Policy with Correct Permissions

1. In IAM, go to **Policies** → **Create policy**
2. Click the **JSON** tab
3. Paste this policy (replaces both Deny and provides correct Allow):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::dr-birdy-books-files",
        "arn:aws:s3:::dr-birdy-books-files/*"
      ]
    }
  ]
}
```

**Important**: This is an **IAM identity-based policy** (for attaching to users/roles). It does **NOT** need a `Principal` element. The `Principal` element is only used in resource-based policies (like S3 bucket policies), not identity-based policies.

4. Click **Next**
5. Give it a name: `DrBirdyBooksS3Access-Fixed`
6. Click **Create policy**
7. Go back to the **Contract_Developer** user
8. **Attach the new policy** and **detach the old problematic policy**

#### Option C: Modify Resource in Deny Statement (If Deny is Needed for Other Buckets)

If you need the Deny for other S3 buckets but want to allow this specific bucket:

1. Find the Deny statement
2. Modify it to exclude your bucket:

**Before (blocks everything):**
```json
{
  "Effect": "Deny",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::dr-birdy-books-files/*"
}
```

**After (allows your bucket, denies others):**
```json
{
  "Effect": "Deny",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::*",
  "Condition": {
    "StringNotEquals": {
      "s3:ExistingObjectTag/Bucket": "dr-birdy-books-files"
    }
  }
}
```

Or simply remove the Deny for your specific bucket:
```json
{
  "Effect": "Deny",
  "Action": "s3:GetObject",
  "NotResource": [
    "arn:aws:s3:::dr-birdy-books-files/*"
  ]
}
```

### Step 4: Verify the Fix

After making changes, wait 1-2 minutes for IAM changes to propagate, then test:

1. **Test via AWS CLI** (if installed):
   ```bash
   aws s3 cp s3://dr-birdy-books-files/files/1767209037431-480982944-code.png /tmp/test-download.png --profile your-profile
   ```

2. **Test via your application**:
   - Try downloading the file again through your backend
   - The error should be resolved

3. **Check IAM Policy Simulator** (optional):
   - Go to IAM → **Policies** → Select your policy → **Policy simulator**
   - Test action: `s3:GetObject`
   - Test resource: `arn:aws:s3:::dr-birdy-books-files/files/*`
   - Should show **Allow** (not Deny)

## Required Permissions Summary

For the Dr. Birdy Books Protocol to work with S3, your IAM user needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::dr-birdy-books-files",
        "arn:aws:s3:::dr-birdy-books-files/*"
      ]
    }
  ]
}
```

**Actions explained**:
- `s3:PutObject` - Upload files
- `s3:GetObject` - Download files (THIS WAS BLOCKED)
- `s3:DeleteObject` - Delete files
- `s3:ListBucket` - List files in bucket

**Resources explained**:
- `arn:aws:s3:::dr-birdy-books-files` - Bucket level (required for ListBucket)
- `arn:aws:s3:::dr-birdy-books-files/*` - Object level (required for GetObject, PutObject, DeleteObject)

## Common Issues

### Issue: "Missing Principal" Error

**Error**: `Missing Principal: Add a Principal element to the policy statement.`

**Solution**: This error is misleading! The policy shown in this guide is an **IAM identity-based policy**, which does **NOT** require a `Principal` element. The `Principal` element is only needed for resource-based policies (like S3 bucket policies).

If you're creating this in **IAM → Policies → Create policy**, ignore this error - it's a false positive from some validators. The policy will work correctly when attached to a user.

**To verify you're in the right place**:
- ✅ You should be in: **IAM Console → Policies → Create policy**
- ❌ NOT in: **S3 Console → Bucket → Permissions → Bucket policy**

If you're trying to create a bucket policy instead (which DOES need Principal), use this format:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::378173487837:user/Contract_Developer"
      },
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::dr-birdy-books-files/*"
    }
  ]
}
```

However, for this use case, you should use an **IAM user policy** (no Principal needed), not a bucket policy.

### Issue: Can't find the Deny statement

**Solution**: 
- Check all policies (user policies, group policies, permissions boundaries)
- Use AWS CLI to check effective permissions:
  ```bash
  aws iam simulate-principal-policy \
    --policy-source-arn arn:aws:iam::378173487837:user/Contract_Developer \
    --action-names s3:GetObject \
    --resource-arns arn:aws:s3:::dr-birdy-books-files/files/*
  ```

### Issue: Policy is attached to a Group

**Solution**:
- If the user is in a group with the Deny policy, you have two options:
  1. Remove the user from that group
  2. Modify the group policy to remove the Deny statement

### Issue: Changes don't take effect immediately

**Solution**:
- IAM changes can take up to 5 minutes to propagate
- Wait a few minutes and try again
- Clear any cached credentials if using AWS CLI/SDK

### Issue: Still getting errors after fix

**Solution**:
- Double-check the resource ARN matches exactly (case-sensitive)
- Verify the bucket name in your `.env` file matches: `dr-birdy-books-files`
- Check for typos in the policy JSON
- Ensure no other policies are conflicting

## Prevention

To avoid this issue in the future:

1. **Use Allow-only policies** - Avoid Deny statements unless absolutely necessary
2. **Be specific with resources** - Don't use wildcards (`*`) unless needed
3. **Document policies** - Add descriptions explaining why policies exist
4. **Test before production** - Use IAM Policy Simulator before deploying
5. **Use separate users/roles** - Different users for different purposes reduces conflicts

## Quick Checklist

- [ ] Found the policy with the explicit Deny statement
- [ ] Removed or modified the Deny statement
- [ ] Verified Allow statement exists for `s3:GetObject`
- [ ] Resource ARN matches your bucket: `arn:aws:s3:::dr-birdy-books-files/*`
- [ ] Saved policy changes
- [ ] Waited 1-2 minutes for propagation
- [ ] Tested file download
- [ ] Download works successfully

## Need Help?

If you're still having issues:

1. Check AWS CloudTrail logs for detailed permission errors
2. Use IAM Policy Simulator to test policies
3. Review AWS IAM documentation on policy evaluation logic
4. Contact your AWS administrator if you don't have IAM permissions

---

**After fixing**: Your file downloads should work! 🎉

