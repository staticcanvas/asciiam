#!/usr/bin/env pwsh

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = [System.IO.Path]::GetDirectoryName($MyInvocation.MyCommand.Path)
$manifestPath = [System.IO.Path]::Combine($repositoryRoot, 'tools', 'devt', 'devt.psd1')

Import-Module $manifestPath -Force
Invoke-Devt @args
