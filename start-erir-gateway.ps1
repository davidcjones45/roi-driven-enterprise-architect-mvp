param(
    [Parameter(Mandatory = $true)]
    [string]$ErirRoot,
    [string]$Python = "python",
    [int]$Port = 8766
)

$gateway = Join-Path $PSScriptRoot "erir_gateway.py"
if (-not (Test-Path -LiteralPath $ErirRoot -PathType Container)) {
    throw "ERIR root was not found: $ErirRoot"
}
if (-not (Test-Path -LiteralPath (Join-Path $ErirRoot "schemas") -PathType Container)) {
    throw "The ERIR root does not contain a schemas directory: $ErirRoot"
}

& $Python $gateway --erir-root $ErirRoot --port $Port --data-root (Join-Path $PSScriptRoot "gateway-data")
