# Example usage:
# .\update-version.ps1 5.8.0

param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

function Update-NpmPackageVersion {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Version,
        
        [Parameter(Mandatory=$true)]
        [string]$FolderPath,
        
        [Parameter(Mandatory=$false)]
        [switch]$Force
    )

    # Validate version format (semantic versioning)
    if ($Version -notmatch '^\d+\.\d+\.\d+(-[\w\.]+)?(\+[\w\.]+)?$') {
        Write-Host "Error: Invalid version format. Please use semantic versioning (e.g., 1.0.0, 2.1.0-beta.1)" -ForegroundColor Red
        return
    }

    # Validate and resolve folder path
    try {
        $resolvedPath = Resolve-Path $FolderPath -ErrorAction Stop
        if (-not (Test-Path $resolvedPath)) {
            Write-Host "Error: Folder path does not exist: $FolderPath" -ForegroundColor Red
            return
        }
    } catch {
        Write-Host "Error: Invalid folder path: $FolderPath" -ForegroundColor Red
        return
    }

    # Check if package.json exists in the specified folder
    $packageJsonPath = Join-Path $resolvedPath "package.json"
    if (-not (Test-Path $packageJsonPath)) {
        Write-Host "Error package.json not found in folder: $FolderPath" -ForegroundColor Red
        return
    }

    try {
        # Store original location
        $originalLocation = Get-Location

        # Change to the specified directory
        Set-Location $resolvedPath

        # Get current version for output
        $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
        $oldVersion = $packageJson.version

        # Prepare npm command arguments
        $npmArgs = @($Version, '--no-git-tag-version', '--allow-same-version')
        if ($Force) {
            $npmArgs += '--force'
        }

        # Update version using npm version command
        $result = npm version @npmArgs 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Host "Successfully updated package version from $oldVersion to $Version in folder: $FolderPath" -ForegroundColor Green
        } else {
            Write-Host "Error: npm version command failed: $result" -ForegroundColor Red
        }
    } catch {
        Write-Host "Error: An error occured while updating package version: $_" -ForegroundColor Red
    } finally {
        # Restore original location
        Set-Location $originalLocation
    }
}

# Example usage:
# Update-NpmPackageVersion -Version "1.2.3" -FolderPath "C:\path\to\project"
# Update-NpmPackageVersion -Version "1.2.3" -FolderPath ".\relative\path" -Force

Update-NpmPackageVersion -Version "$Version" -FolderPath "..\backend"
Update-NpmPackageVersion -Version "$Version" -FolderPath "..\admin"
Update-NpmPackageVersion -Version "$Version" -FolderPath "..\frontend"
Update-NpmPackageVersion -Version "$Version" -FolderPath "..\mobile"

function Format-Json {
    <#
    .SYNOPSIS
        Prettifies JSON output.
        Version January 3rd 2024
        Fixes:
            - empty [] or {} or in-line arrays as per https://stackoverflow.com/a/71664664/9898643
              by Widlov (https://stackoverflow.com/users/1716283/widlov)
            - Unicode Apostrophs \u0027 as written by ConvertTo-Json are replaced with regular single quotes "'"
            - multiline empty [] or {} are converted into inline arrays or objects
    .DESCRIPTION
        Reformats a JSON string so the output looks better than what ConvertTo-Json outputs.
    .PARAMETER Json
        Required: [string] The JSON text to prettify.
    .PARAMETER Minify
        Optional: Returns the json string compressed.
    .PARAMETER Indentation
        Optional: The number of spaces (1..1024) to use for indentation. Defaults to 2.
    .PARAMETER AsArray
        Optional: If set, the output will be in the form of a string array, otherwise a single string is output.
    .EXAMPLE
        $json | ConvertTo-Json | Format-Json -Indentation 4
    .OUTPUTS
        System.String or System.String[] (the latter when parameter AsArray is set)
    #>
    [CmdletBinding(DefaultParameterSetName = 'Prettify')]
    Param(
        [Parameter(Mandatory = $true, Position = 0, ValueFromPipeline = $true)]
        [string]$Json,

        [Parameter(ParameterSetName = 'Minify')]
        [switch]$Minify,

        [Parameter(ParameterSetName = 'Prettify')]
        [ValidateRange(1, 1024)]
        [int]$Indentation = 2,

        [Parameter(ParameterSetName = 'Prettify')]
        [switch]$AsArray
    )

    if ($PSCmdlet.ParameterSetName -eq 'Minify') {
        return ($Json | ConvertFrom-Json) | ConvertTo-Json -Depth 100 -Compress
    }

    # If the input JSON text has been created with ConvertTo-Json -Compress
    # then we first need to reconvert it without compression
    if ($Json -notmatch '\r?\n') {
        $Json = ($Json | ConvertFrom-Json) | ConvertTo-Json -Depth 100
    }

    $indent = 0
    $regexUnlessQuoted = '(?=([^"]*"[^"]*")*[^"]*$)'

    $result = ($Json -split '\r?\n' | ForEach-Object {
        # If the line contains a ] or } character, 
        # we need to decrement the indentation level unless:
        #   - it is inside quotes, AND
        #   - it does not contain a [ or {
        if (($_ -match "[}\]]$regexUnlessQuoted") -and ($_ -notmatch "[\{\[]$regexUnlessQuoted")) {
            $indent = [Math]::Max($indent - $Indentation, 0)
        }

        # Replace all colon-space combinations by ": " unless it is inside quotes.
        $line = (' ' * $indent) + ($_.TrimStart() -replace ":\s+$regexUnlessQuoted", ': ')

        # If the line contains a [ or { character, 
        # we need to increment the indentation level unless:
        #   - it is inside quotes, AND
        #   - it does not contain a ] or }
        if (($_ -match "[\{\[]$regexUnlessQuoted") -and ($_ -notmatch "[}\]]$regexUnlessQuoted")) {
            $indent += $Indentation
        }

        # ConvertTo-Json returns all single-quote characters as Unicode Apostrophs \u0027
        # see: https://stackoverflow.com/a/29312389/9898643
        $line -replace '\\u0027', "'"

    # join the array with newlines and convert multiline empty [] or {} into inline arrays or objects
    }) -join [Environment]::NewLine -replace '(\[)\s+(\])', '$1$2' -replace '(\{)\s+(\})', '$1$2'

    if ($AsArray) { return ,[string[]]($result -split '\r?\n') }
    $result
}

function Update-ExpoAppJson {
    param (
        [string]$Version,
        [string]$FolderPath
    )

    $appJsonPath = Join-Path -Path $FolderPath -ChildPath "app.json"
    
    if (-Not (Test-Path $appJsonPath)) {
        Write-Host "Error: app.json not found in the specified folder." -ForegroundColor Red
        return
    }

    # Read the app.json content
    $appJsonContent = Get-Content -Path $appJsonPath -Raw
    
    # Remove comments from JSON content
    #  $appJsonContent = $appJsonContent -replace '(?m)//.*$', ''

    # Remove single-line comments
    $appJsonContent = $appJsonContent -replace '(?m)(?<=^([^"]|"[^"]*")*)//.*', ''

    # Remove multi-line comments
    # $appJsonContent = $appJsonContent -replace '(?ms)/\*.*?\*/', ''
    
    # Write-Host $appJsonContent

    try {
        # Convert JSON to PowerShell object
        $appJson = $appJsonContent | ConvertFrom-Json
    } catch {
        Write-Host "Error: Failed to parse app.json." -ForegroundColor Red
        return
    }

    # Check if expo section exists
    if (-Not $appJson.expo) {
        Write-Host "Error: No expo configuration found in app.json." -ForegroundColor Red
        return
    }
    
    # Update the version and buildNumber
    $oldVersion = $appJson.expo.version
    $appJson.expo.version = $Version
    $appJson.expo.ios.buildNumber = $Version
    $appJson.expo.android.versionCode = [int]($Version -replace '\.', '')
    
    # Convert back to JSON while preserving formatting
    $updatedJson = $appJson | ConvertTo-Json -Depth 10 | Format-Json | Out-String
    
    # Write back to file
    Set-Content -Path $appJsonPath -Value $updatedJson -Encoding UTF8
    Write-Host "Successfully updated app.json from $oldVersion to $Version in folder: $FolderPath" -ForegroundColor Green
}

# Example usage:
# Update-ExpoAppJson -Version "1.2.3" -FolderPath "C:\path\to\project"

Update-ExpoAppJson -Version "$Version" -FolderPath "..\mobile"
